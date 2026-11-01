import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AssertionResult, RunReport } from './lighthouseSummary.ts';

const RUN_FILE = /^lhr-.*\.json$/;
const ASSERTIONS_FILE = 'assertion-results.json';
const LINKS_FILE = 'links.json';

export type LighthouseResults = {
  runs: RunReport[];
  assertions: AssertionResult[];
  reportLinks: Record<string, string>;
};

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

/** Missing files mean an earlier step (collect, upload, assert) failed; its own log says why. */
const readJsonIfPresent = <T>(file: string, fallback: T): T => (existsSync(file) ? readJson<T>(file) : fallback);

export function loadLighthouseResults(dir: string): LighthouseResults {
  const runFiles = existsSync(dir) ? readdirSync(dir).filter((file) => RUN_FILE.test(file)) : [];
  return {
    runs: runFiles.map((file) => readJson<RunReport>(join(dir, file))),
    assertions: readJsonIfPresent<AssertionResult[]>(join(dir, ASSERTIONS_FILE), []),
    reportLinks: readJsonIfPresent<Record<string, string>>(join(dir, LINKS_FILE), {}),
  };
}
