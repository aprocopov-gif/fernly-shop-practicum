import http from 'k6/http';
import { check, sleep } from 'k6';

const API_URL = __ENV.API_URL || 'http://localhost:8100';
const SCENARIO = __ENV.SCENARIO || 'smoke';
const SEARCH_TERM = 'monstera';
const ENDPOINTS = ['catalog', 'search', 'plant'];

/** Placeholder SLO ceilings until perf targets are owned; limits come from baseline.json p95 × 3. */
function limitFromBaseline(p95) {
  if (p95 == null || Number.isNaN(p95)) {
    return 300;
  }
  return Math.min(300, Math.max(50, 3 * p95));
}

function loadBaseline() {
  try {
    return JSON.parse(open('./baseline.json'));
  } catch {
    return {};
  }
}

const baseline = loadBaseline();
const limits = Object.fromEntries(
  ENDPOINTS.map((name) => [name, limitFromBaseline(baseline[name]?.p95)]),
);

const durationThresholds = Object.fromEntries(
  ENDPOINTS.map((name) => [`http_req_duration{endpoint:${name}}`, [`p(95)<${limits[name]}`]]),
);

export const options = {
  summaryTrendStats: ['med', 'p(95)', 'p(99)'],
  scenarios: {
    [SCENARIO]:
      SCENARIO === 'load'
        ? {
            executor: 'constant-vus',
            vus: 20,
            duration: '30s',
            exec: 'shopperJourney',
          }
        : {
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: 10,
            exec: 'shopperJourney',
          },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    ...durationThresholds,
  },
};

export default function () {
  shopperJourney();
}

export function shopperJourney() {
  const catalogRes = http.get(`${API_URL}/api/plants`, { tags: { endpoint: 'catalog' } });
  check(catalogRes, {
    'catalog status 200': (r) => r.status === 200,
  });

  const searchRes = http.get(`${API_URL}/api/plants?search=${encodeURIComponent(SEARCH_TERM)}`, {
    tags: { endpoint: 'search' },
  });
  check(searchRes, {
    'search status 200': (r) => r.status === 200,
  });

  let plantId = 'pl-monstera';
  if (catalogRes.status === 200) {
    try {
      const body = catalogRes.json();
      if (body.items?.length) {
        plantId = body.items[0].id;
      }
    } catch {
      /* keep default plant id */
    }
  }

  const plantRes = http.get(`${API_URL}/api/plants/${plantId}`, { tags: { endpoint: 'plant' } });
  check(plantRes, {
    'plant status 200': (r) => r.status === 200,
  });

  if (SCENARIO === 'load') {
    sleep(1);
  }
}

function metricValues(data, endpoint) {
  const key = `http_req_duration{endpoint:${endpoint}}`;
  const metric = data.metrics[key];
  if (!metric?.values) {
    return null;
  }
  const { med, 'p(95)': p95, 'p(99)': p99 } = metric.values;
  return { p50: med, p95, p99 };
}

function thresholdPassed(data, endpoint) {
  const key = `http_req_duration{endpoint:${endpoint}}`;
  const metric = data.metrics[key];
  const thresholds = metric?.thresholds;
  if (!thresholds) {
    return true;
  }
  return Object.values(thresholds).every((t) => t.ok);
}

function buildReport(data) {
  const rows = ENDPOINTS.map((endpoint) => {
    const values = metricValues(data, endpoint);
    const limit = limits[endpoint];
    const pass = values != null && values.p95 <= limit && thresholdPassed(data, endpoint);
    return {
      endpoint,
      p50: values?.p50 ?? null,
      p95: values?.p95 ?? null,
      p99: values?.p99 ?? null,
      limit,
      pass,
    };
  });

  const header = '| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | Limit (ms) | Result |';
  const separator = '| --- | ---: | ---: | ---: | ---: | --- |';
  const body = rows.map(
    (r) =>
      `| ${r.endpoint} | ${formatMs(r.p50)} | ${formatMs(r.p95)} | ${formatMs(r.p99)} | ${r.limit} | ${r.pass ? 'pass' : 'fail'} |`,
  );

  const markdown = [
    `# Catalog performance (${SCENARIO})`,
    '',
    header,
    separator,
    ...body,
    '',
  ].join('\n');

  return { markdown, rows };
}

function formatMs(value) {
  if (value == null) {
    return '—';
  }
  return Number(value).toFixed(2);
}

export function handleSummary(data) {
  const { markdown, rows } = buildReport(data);
  const jsonPayload = {
    scenario: SCENARIO,
    generatedAt: new Date().toISOString(),
    limits,
    endpoints: rows,
    metrics: data.metrics,
  };

  const outputs = {
    stdout: `${markdown}\n`,
    [`reports/k6/catalog-${SCENARIO}.md`]: markdown,
    [`reports/k6/catalog-${SCENARIO}.json`]: JSON.stringify(jsonPayload, null, 2),
  };

  if (__ENV.SAVE_BASELINE === '1') {
    const nextBaseline = {};
    for (const endpoint of ENDPOINTS) {
      const values = metricValues(data, endpoint);
      nextBaseline[endpoint] = { p95: values?.p95 ?? baseline[endpoint]?.p95 ?? 0 };
    }
    outputs['tests/performance/baseline.json'] = `${JSON.stringify(nextBaseline, null, 2)}\n`;
  }

  return outputs;
}