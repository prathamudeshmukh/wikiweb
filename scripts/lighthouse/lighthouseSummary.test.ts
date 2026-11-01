import { findRedirectedRuns, renderSummary, type AssertionResult, type RunReport } from './lighthouseSummary';

const PREVIEW_URL = 'https://tangent-abc123.vercel.app/';

const run = (finalDisplayedUrl: string, performance = 0.85): RunReport => ({
  requestedUrl: PREVIEW_URL,
  finalDisplayedUrl,
  categories: { performance: { score: performance }, accessibility: { score: 0.93 } },
});

const assertion = (overrides: Partial<AssertionResult>): AssertionResult => ({
  auditId: 'total-blocking-time',
  level: 'error',
  passed: false,
  operator: '<=',
  expected: 700,
  actual: 812.4,
  url: PREVIEW_URL,
  ...overrides,
});

describe('findRedirectedRuns', () => {
  it('accepts runs that stay on the preview origin, even after the app changes path', () => {
    const runs = [run(`${PREVIEW_URL}onboarding`), run(PREVIEW_URL)];

    expect(findRedirectedRuns(runs, PREVIEW_URL)).toEqual([]);
  });

  it('flags runs that landed on another origin, such as the Vercel login page', () => {
    const loginRun = run('https://vercel.com/login?next=%2Fsso-api');

    const redirected = findRedirectedRuns([run(PREVIEW_URL), loginRun], PREVIEW_URL);

    expect(redirected).toEqual([loginRun]);
  });
});

describe('renderSummary', () => {
  const base = { url: PREVIEW_URL, runs: [run(PREVIEW_URL, 0.74), run(PREVIEW_URL, 0.85), run(PREVIEW_URL, 0.83)], reportLinks: {} };

  it('headlines a failed gate and lists each failing error with readable values', () => {
    const summary = renderSummary({ ...base, assertions: [assertion({})] });

    expect(summary).toContain('❌ Lighthouse gate failed');
    expect(summary).toContain('| Total blocking time | 812 ms | ≤ 700 ms |');
  });

  it('passes the gate when only targets are missed, and lists them as warnings', () => {
    const missedTarget = assertion({ auditId: 'categories', auditProperty: 'performance', level: 'warn', operator: '>=', expected: 0.9, actual: 0.83 });

    const summary = renderSummary({ ...base, assertions: [missedTarget] });

    expect(summary).toContain('✅ Lighthouse gate passed');
    expect(summary).toContain('### Targets not yet met');
    expect(summary).toContain('| Performance score | 0.83 | ≥ 0.9 |');
  });

  it('formats byte budgets in KB and layout shift as a unitless value', () => {
    const bytes = assertion({ auditId: 'resource-summary', auditProperty: 'script.size', expected: 500000, actual: 724469 });
    const shift = assertion({ auditId: 'cumulative-layout-shift', expected: 0.1, actual: 0.1234 });

    const summary = renderSummary({ ...base, assertions: [bytes, shift] });

    expect(summary).toContain('| Script transfer size | 707 KB | ≤ 488 KB |');
    expect(summary).toContain('| Cumulative layout shift | 0.123 | ≤ 0.1 |');
  });

  it('shows the median score of each category across runs and links the report', () => {
    const summary = renderSummary({ ...base, assertions: [], reportLinks: { [PREVIEW_URL]: 'https://storage.googleapis.com/report.html' } });

    expect(summary).toContain('| Performance | 0.83 |');
    expect(summary).toContain('[Full report](https://storage.googleapis.com/report.html)');
  });

  it('says so when no report link was uploaded, rather than linking nothing', () => {
    const summary = renderSummary({ ...base, assertions: [] });

    expect(summary).toContain('No report link');
  });
});
