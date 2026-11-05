// Writes the Lighthouse CI job's step summary, and fails if any run audited another origin
// (a login wall) instead of the deployment.
//   node scripts/lighthouse-summary.ts <audited url>
import { appendFileSync } from 'node:fs';
import { findRedirectedRuns, renderSummary } from './lighthouse/lighthouseSummary.ts';
import { loadLighthouseResults } from './lighthouse/loadLighthouseResults.ts';

const RESULTS_DIR = '.lighthouseci';

const url = process.argv[2];
if (!url) {
  process.stderr.write('Usage: node scripts/lighthouse-summary.ts <audited url>\n');
  process.exit(2);
}

const results = loadLighthouseResults(RESULTS_DIR);
const summary = renderSummary({ url, ...results });
const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (summaryFile) appendFileSync(summaryFile, `${summary}\n`);
else process.stdout.write(`${summary}\n`);

const redirected = findRedirectedRuns(results.runs, url);
if (results.runs.length === 0) {
  process.stdout.write(`::error::Lighthouse wrote no results to ${RESULTS_DIR}/; see the collect step.\n`);
  process.exit(1);
}
if (redirected.length > 0) {
  const landedOn = [...new Set(redirected.map((run) => new URL(run.finalDisplayedUrl).origin))].join(', ');
  process.stdout.write(
    `::error::${redirected.length} of ${results.runs.length} Lighthouse runs ended on ${landedOn}, not ${url}. ` +
      'Deployment Protection likely served its login page; check VERCEL_AUTOMATION_BYPASS_SECRET.\n',
  );
  process.exit(1);
}
