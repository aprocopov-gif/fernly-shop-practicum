import http from 'k6/http';
import { check, sleep } from 'k6';

// docs/features/popular-plants.md — "How fast it must be":
// ~20 shoppers browsing at once; 95% of GET /api/popular and GET /api/plants
// within 300 ms; no failed requests.

const API_URL = __ENV.API_URL || 'http://localhost:8100';
const SCENARIO = __ENV.SCENARIO || 'smoke';
const PLANT_PAGE_ID = 'pl-aloe';
const P95_LIMIT_MS = 300;
const FEATURE = 'popular';
const ENDPOINTS = ['plant', 'catalog', 'popular'];

const durationThresholds = Object.fromEntries(
  ENDPOINTS.map((name) => [`http_req_duration{endpoint:${name}}`, [`p(95)<${P95_LIMIT_MS}`]]),
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
    'http_req_failed{endpoint:popular}': ['rate==0'],
    'http_req_failed{endpoint:catalog}': ['rate==0'],
    ...durationThresholds,
  },
};

export default function () {
  shopperJourney();
}

export function shopperJourney() {
  const plantRes = http.get(`${API_URL}/api/plants/${PLANT_PAGE_ID}`, {
    tags: { endpoint: 'plant' },
  });
  check(plantRes, {
    'plant status 200': (r) => r.status === 200,
  });

  const catalogRes = http.get(`${API_URL}/api/plants`, { tags: { endpoint: 'catalog' } });
  check(catalogRes, {
    'catalog status 200': (r) => r.status === 200,
  });

  const popularRes = http.get(`${API_URL}/api/popular?limit=5`, { tags: { endpoint: 'popular' } });
  check(popularRes, {
    'popular status 200': (r) => r.status === 200,
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
    const pass = values != null && values.p95 <= P95_LIMIT_MS && thresholdPassed(data, endpoint);
    return {
      endpoint,
      p50: values?.p50 ?? null,
      p95: values?.p95 ?? null,
      p99: values?.p99 ?? null,
      limit: P95_LIMIT_MS,
      pass,
    };
  });

  const header = '| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | Limit (ms) | Result |';
  const separator = '| --- | ---: | ---: | ---: | ---: | --- |';
  const body = rows.map(
    (r) =>
      `| ${r.endpoint} | ${formatMs(r.p50)} | ${formatMs(r.p95)} | ${formatMs(r.p99)} | ${r.limit} | ${r.pass ? 'pass' : 'fail'} |`,
  );

  const markdown = [`# Popular plants performance (${SCENARIO})`, '', header, separator, ...body, ''].join(
    '\n',
  );

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
    limitMs: P95_LIMIT_MS,
    endpoints: rows,
    metrics: data.metrics,
  };

  return {
    stdout: `${markdown}\n`,
    [`reports/k6/${FEATURE}-${SCENARIO}.md`]: markdown,
    [`reports/k6/${FEATURE}-${SCENARIO}.json`]: JSON.stringify(jsonPayload, null, 2),
  };
}