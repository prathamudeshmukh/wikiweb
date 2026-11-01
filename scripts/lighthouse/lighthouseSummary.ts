// Turns Lighthouse CI's output (.lighthouseci/) into the CI job's step summary,
// and catches runs that audited some other page than the one deployed.

/** One entry of `.lighthouseci/assertion-results.json`; LHCI writes only the assertions that failed. */
export type AssertionResult = {
  auditId: string;
  auditProperty?: string;
  level: 'error' | 'warn';
  passed: boolean;
  operator: string;
  expected: number;
  actual: number;
  url: string;
};

/** The parts of a Lighthouse result (`lhr-*.json`) the summary reads. */
export type RunReport = {
  requestedUrl: string;
  finalDisplayedUrl: string;
  categories: Record<string, { score: number | null }>;
};

export type SummaryInput = {
  url: string;
  assertions: AssertionResult[];
  runs: RunReport[];
  /** `.lighthouseci/links.json`: audited URL → uploaded report. */
  reportLinks: Record<string, string>;
};

type Unit = 'ms' | 'kb' | 'score' | 'unitless';

const BYTES_PER_KB = 1024;
const SCORE_DECIMALS = 2;
const UNITLESS_DECIMALS = 3;

const AUDITS: Record<string, { label: string; unit: Unit }> = {
  'categories:performance': { label: 'Performance score', unit: 'score' },
  'categories:accessibility': { label: 'Accessibility score', unit: 'score' },
  'categories:best-practices': { label: 'Best practices score', unit: 'score' },
  'categories:seo': { label: 'SEO score', unit: 'score' },
  'largest-contentful-paint': { label: 'Largest contentful paint', unit: 'ms' },
  'total-blocking-time': { label: 'Total blocking time', unit: 'ms' },
  'cumulative-layout-shift': { label: 'Cumulative layout shift', unit: 'unitless' },
  interactive: { label: 'Time to interactive', unit: 'ms' },
  'total-byte-weight': { label: 'Total transfer size', unit: 'kb' },
  'resource-summary:script.size': { label: 'Script transfer size', unit: 'kb' },
};

const CATEGORY_LABELS: Record<string, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best practices',
  seo: 'SEO',
};

const OPERATOR_SYMBOLS: Record<string, string> = { '<=': '≤', '>=': '≥', '<': '<', '>': '>', '==': '=' };

const originOf = (url: string) => new URL(url).origin;

/** The app may change path (`/` → `/onboarding`), but a run that ends on another origin audited a login wall. */
export function findRedirectedRuns(runs: RunReport[], expectedUrl: string): RunReport[] {
  const expectedOrigin = originOf(expectedUrl);
  return runs.filter((run) => originOf(run.finalDisplayedUrl) !== expectedOrigin);
}

const auditKey = ({ auditId, auditProperty }: AssertionResult) =>
  auditProperty ? `${auditId}:${auditProperty}` : auditId;

function formatValue(value: number, unit: Unit): string {
  switch (unit) {
    case 'ms':
      return `${Math.round(value).toLocaleString('en-US')} ms`;
    case 'kb':
      return `${Math.round(value / BYTES_PER_KB).toLocaleString('en-US')} KB`;
    case 'score':
      return String(Number(value.toFixed(SCORE_DECIMALS)));
    case 'unitless':
      return String(Number(value.toFixed(UNITLESS_DECIMALS)));
  }
}

function assertionRow(result: AssertionResult): string {
  const key = auditKey(result);
  const { label, unit } = AUDITS[key] ?? { label: key, unit: 'unitless' };
  const operator = OPERATOR_SYMBOLS[result.operator] ?? result.operator;
  return `| ${label} | ${formatValue(result.actual, unit)} | ${operator} ${formatValue(result.expected, unit)} |`;
}

function assertionTable(title: string, results: AssertionResult[]): string[] {
  if (results.length === 0) return [];
  return [`### ${title}`, '', '| Check | Found | Threshold |', '|---|---|---|', ...results.map(assertionRow), ''];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function scoreTable(runs: RunReport[]): string[] {
  const categories = Object.keys(runs[0]?.categories ?? {});
  const rows = categories.map((category) => {
    const scores = runs.map((run) => run.categories[category]?.score).filter((score): score is number => score != null);
    const label = CATEGORY_LABELS[category] ?? category;
    return `| ${label} | ${scores.length ? formatValue(median(scores), 'score') : 'n/a'} |`;
  });
  return [`### Median scores (${runs.length} runs)`, '', '| Category | Score |', '|---|---|', ...rows, ''];
}

export function renderSummary({ url, assertions, runs, reportLinks }: SummaryInput): string {
  const failures = assertions.filter((result) => !result.passed && result.level === 'error');
  const missedTargets = assertions.filter((result) => !result.passed && result.level === 'warn');
  const reportLink = reportLinks[url] ?? Object.values(reportLinks)[0];
  const headline = failures.length
    ? `## ❌ Lighthouse gate failed (${failures.length} check${failures.length === 1 ? '' : 's'})`
    : '## ✅ Lighthouse gate passed';

  return [
    headline,
    '',
    `Audited ${url} — ${reportLink ? `[Full report](${reportLink})` : 'No report link (upload failed or was skipped)'}`,
    '',
    ...assertionTable('Gate failures', failures),
    ...assertionTable('Targets not yet met', missedTargets),
    ...scoreTable(runs),
  ].join('\n');
}
