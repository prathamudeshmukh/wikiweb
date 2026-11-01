import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadLighthouseResults } from './loadLighthouseResults';

const PREVIEW_URL = 'https://tangent-abc123.vercel.app/';
const lhr = { requestedUrl: PREVIEW_URL, finalDisplayedUrl: PREVIEW_URL, categories: { performance: { score: 0.8 } }, audits: {} };

describe('loadLighthouseResults', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tangent-lhci-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads every run, the assertion results and the report links', () => {
    writeFileSync(join(dir, 'lhr-1.json'), JSON.stringify(lhr));
    writeFileSync(join(dir, 'lhr-2.json'), JSON.stringify(lhr));
    writeFileSync(join(dir, 'lhr-1.html'), '<html></html>');
    writeFileSync(join(dir, 'assertion-results.json'), JSON.stringify([{ auditId: 'interactive' }]));
    writeFileSync(join(dir, 'links.json'), JSON.stringify({ [PREVIEW_URL]: 'https://report' }));

    const results = loadLighthouseResults(dir);

    expect(results.runs.map((run) => run.finalDisplayedUrl)).toEqual([PREVIEW_URL, PREVIEW_URL]);
    expect(results.assertions).toHaveLength(1);
    expect(results.reportLinks).toEqual({ [PREVIEW_URL]: 'https://report' });
  });

  it('treats a missing assert or upload step as no results rather than crashing the summary', () => {
    writeFileSync(join(dir, 'lhr-1.json'), JSON.stringify(lhr));

    const results = loadLighthouseResults(dir);

    expect(results.assertions).toEqual([]);
    expect(results.reportLinks).toEqual({});
  });

  it('returns no runs when Lighthouse never wrote a result', () => {
    const results = loadLighthouseResults(join(dir, 'missing'));

    expect(results.runs).toEqual([]);
  });
});
