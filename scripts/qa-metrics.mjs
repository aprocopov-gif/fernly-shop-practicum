#!/usr/bin/env node
/**
 * QA pipeline metrics from GitHub (read-only via gh). Node 22+, no dependencies.
 * Writes docs/QA-METRICS.md locally; never writes to GitHub.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = path.join(ROOT, 'docs/QA-METRICS.md');

const QA_MARKER = '<!-- fernly-qa-report -->';
const PLAN_BOT = 'github-actions[bot]';
const PLAN_REVIEW_RE = /^Plan review:\s*(\d+)\s*\/\s*(\d+)/i;
const WORKFLOW_FILE = 'pr-triage.yml';

function env(name, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

function gh(args, options = {}) {
  try {
    return execFileSync('gh', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
      ...options,
    });
  } catch (err) {
    if (options.allowFail) return null;
    const msg = err.stderr?.toString() || err.message;
    throw new Error(`gh ${args.join(' ')}: ${msg}`);
  }
}

function ghJson(args, options = {}) {
  const out = gh(args, options);
  if (out === null) return null;
  const text = out.trim();
  if (!text) return null;
  return JSON.parse(text);
}

function repoSlug() {
  const fromEnv = env('GITHUB_REPOSITORY');
  if (fromEnv) return fromEnv;
  const data = ghJson(['repo', 'view', '--json', 'nameWithOwner']);
  return data.nameWithOwner;
}

/** @returns {Array<Record<string, unknown>>} */
function paginatedIssueComments(repo, issueNumber) {
  const raw = gh([
    'api',
    `repos/${repo}/issues/${issueNumber}/comments`,
    '--paginate',
  ]);
  const chunks = raw.trim().split(/\n(?=\[)/);
  /** @type {Array<Record<string, unknown>>} */
  const all = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const part = JSON.parse(chunk);
    if (Array.isArray(part)) all.push(...part);
    else all.push(part);
  }
  return all.sort(
    (a, b) =>
      new Date(String(a.created_at)).getTime() -
      new Date(String(b.created_at)).getTime(),
  );
}

function isQaReport(body) {
  return String(body ?? '').trimStart().startsWith(QA_MARKER);
}

function isResultsComment(body) {
  const t = String(body ?? '').trimStart();
  return (
    /^Approved plan executed/i.test(t) ||
    /^\*\*Results:\*\*/m.test(t) ||
    /docs\/test-plans\/.*-results\.md/i.test(t)
  );
}

function isBot(user) {
  if (!user) return true;
  if (user.type === 'Bot') return true;
  const login = String(user.login ?? '');
  return login.endsWith('[bot]');
}

function minutesBetween(startIso, endIso) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.round((ms / 60_000) * 10) / 10;
}

function parsePlanReview(comments) {
  const human = comments.filter((c) => !isBot(c.user));
  for (let i = human.length - 1; i >= 0; i--) {
    const body = String(human[i].body ?? '').trimStart();
    const m = body.match(PLAN_REVIEW_RE);
    if (m) {
      return { rowsRight: Number(m[1]), rowsReviewed: Number(m[2]) };
    }
  }
  return { rowsRight: null, rowsReviewed: null };
}

function firstPlanComment(comments) {
  return comments.find(
    (c) =>
      c.user?.login === PLAN_BOT &&
      !isQaReport(c.body) &&
      !isResultsComment(c.body),
  );
}

function firstQaReportComment(comments) {
  return comments.find((c) => isQaReport(c.body));
}

function agentMinutesForBranch(branch) {
  const runs =
    ghJson([
      'run',
      'list',
      '--workflow',
      WORKFLOW_FILE,
      '--branch',
      branch,
      '--json',
      'status,createdAt,updatedAt',
      '--limit',
      '200',
    ]) ?? [];
  let totalMs = 0;
  for (const run of runs) {
    if (run.status !== 'completed') continue;
    if (!run.createdAt || !run.updatedAt) continue;
    const ms =
      new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime();
    if (ms > 0) totalMs += ms;
  }
  return Math.round((totalMs / 60_000) * 10) / 10;
}

/** @returns {{ issues: Array<Record<string, unknown>>, issuesEnabled: boolean }} */
function listQaFindings(repo) {
  const data = ghJson(
    [
      'issue',
      'list',
      '--repo',
      repo,
      '--label',
      'qa-finding',
      '--state',
      'all',
      '--json',
      'number,title,state,stateReason,body,url',
      '--limit',
      '500',
    ],
    { allowFail: true },
  );
  if (data === null) {
    return { issues: [], issuesEnabled: false };
  }
  return { issues: data, issuesEnabled: true };
}

function findingsForPr(issues, prNumber, prUrl) {
  const needles = [
    prUrl,
    `/pull/${prNumber}`,
    `pull request: ${prUrl}`.toLowerCase(),
  ];
  return issues.filter((issue) => {
    const body = String(issue.body ?? '').toLowerCase();
    return needles.some((n) => body.includes(String(n).toLowerCase()));
  });
}

function fmtNum(n) {
  if (n === null || n === undefined) return '—';
  return String(n);
}

function fmtPct(num, den) {
  if (den === 0 || den === null) return '—';
  return `${Math.round((num / den) * 1000) / 10}%`;
}

function buildMarkdown({ repo, rows, totals, issuesEnabled }) {
  const lines = [];
  lines.push('# QA pipeline metrics');
  lines.push('');
  const acc =
    totals.rowsReviewed > 0
      ? fmtPct(totals.rowsRight, totals.rowsReviewed)
      : '—';
  const rowFrac =
    totals.rowsReviewed > 0
      ? `${totals.rowsRight}/${totals.rowsReviewed}`
      : '—';
  const far =
    totals.findings > 0
      ? fmtPct(totals.falseAlarms, totals.findings)
      : totals.findings === 0
        ? '0%'
        : '—';
  const findingFrac =
    totals.findings > 0 || totals.falseAlarms > 0
      ? `${totals.falseAlarms}/${totals.findings}`
      : '0/0';
  lines.push(
    `**Totals (${rows.length} plan-approved PR${rows.length === 1 ? '' : 's'}):** routing accuracy **${acc}** (${rowFrac} plan rows right); false-alarm rate **${far}** (${findingFrac} findings). Agent time **${fmtNum(totals.agentMinutes)}** min across PRs. Spend is not in GitHub — see the [Cursor dashboard](https://cursor.com/dashboard?tab=usage).`,
  );
  lines.push('');
  lines.push(
    '| PR | Rows right | Rows reviewed | Min to plan | Min to QA report | Agent min | Findings | False alarms |',
  );
  lines.push(
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  );
  for (const r of rows) {
    lines.push(
      `| [#${r.number}](${r.url}) | ${fmtNum(r.rowsRight)} | ${fmtNum(r.rowsReviewed)} | ${fmtNum(r.minToPlan)} | ${fmtNum(r.minToQa)} | ${fmtNum(r.agentMinutes)} | ${fmtNum(r.findings)} | ${fmtNum(r.falseAlarms)} |`,
    );
  }
  lines.push('');
  lines.push('## How each number is measured');
  lines.push('');
  lines.push(
    '- **Population:** open and closed pull requests that have the `plan-approved` label.',
  );
  lines.push(
    '- **Rows right / reviewed:** the last PR comment by a non-bot author whose body starts with `Plan review: N/M` (`N` = rows judged correct, `M` = rows reviewed).',
  );
  lines.push(
    `- **Min to plan:** minutes from PR creation to the first plan comment by \`${PLAN_BOT}\` — excluding QA reports (\`${QA_MARKER}\`) and test-run result comments (e.g. “Approved plan executed”).`,
  );
  lines.push(
    `- **Min to QA report:** minutes from PR creation to the first comment containing \`${QA_MARKER}\`.`,
  );
  lines.push(
    `- **Agent min:** sum of wall-clock minutes for **completed** [\`${WORKFLOW_FILE}\`](.github/workflows/pr-triage.yml) workflow runs on the PR head branch (\`updatedAt − createdAt\` per run).`,
  );
  lines.push(
    '- **Findings:** issues labeled `qa-finding` whose body links to the pull request (PR URL or `/pull/<number>`).',
  );
  lines.push(
    '- **False alarms:** subset of those findings closed with GitHub state reason `not_planned`.',
  );
  lines.push(
    '- **Money / API spend:** not available from \`gh\`; use the [Cursor dashboard](https://cursor.com/dashboard?tab=usage) for agent usage and billing.',
  );
  if (!issuesEnabled) {
    lines.push('');
    lines.push(
      `_Note: Issues are disabled on \`${repo}\`, so findings and false-alarm counts are 0 until issues are enabled._`,
    );
  }
  lines.push('');
  lines.push(
    `_Generated at ${new Date().toISOString()} by \`node scripts/qa-metrics.mjs\`._`,
  );
  lines.push('');
  return lines.join('\n');
}

function main() {
  const repo = repoSlug();
  const prs =
    ghJson([
      'pr',
      'list',
      '--repo',
      repo,
      '--label',
      'plan-approved',
      '--state',
      'all',
      '--json',
      'number,title,url,createdAt,headRefName',
      '--limit',
      '500',
    ]) ?? [];

  const { issues, issuesEnabled } = listQaFindings(repo);

  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  const totals = {
    rowsRight: 0,
    rowsReviewed: 0,
    agentMinutes: 0,
    findings: 0,
    falseAlarms: 0,
  };

  for (const pr of prs) {
    const comments = paginatedIssueComments(repo, pr.number);
    const { rowsRight, rowsReviewed } = parsePlanReview(comments);
    const plan = firstPlanComment(comments);
    const qa = firstQaReportComment(comments);
    const minToPlan = plan
      ? minutesBetween(pr.createdAt, plan.created_at)
      : null;
    const minToQa = qa ? minutesBetween(pr.createdAt, qa.created_at) : null;
    const agentMinutes = agentMinutesForBranch(pr.headRefName);
    const linked = findingsForPr(issues, pr.number, pr.url);
    const falseAlarms = linked.filter(
      (i) =>
        i.state === 'CLOSED' &&
        String(i.stateReason ?? '').toLowerCase() === 'not_planned',
    ).length;

    if (rowsRight != null) totals.rowsRight += rowsRight;
    if (rowsReviewed != null) totals.rowsReviewed += rowsReviewed;
    totals.agentMinutes += agentMinutes;
    totals.findings += linked.length;
    totals.falseAlarms += falseAlarms;

    rows.push({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      rowsRight,
      rowsReviewed,
      minToPlan,
      minToQa,
      agentMinutes,
      findings: linked.length,
      falseAlarms,
    });
  }

  rows.sort((a, b) => a.number - b.number);

  const md = buildMarkdown({ repo, rows, totals, issuesEnabled });
  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, md);
  console.log(`Wrote ${OUT_PATH}`);
}

main();