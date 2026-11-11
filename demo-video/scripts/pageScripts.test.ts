import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { pinClockAndRandom } from './pageScripts.ts';

const RECORDED_AT = Date.UTC(2026, 10, 11, 9, 0, 0);
const SEED = 42;

/** Runs the init script in a fresh global, the way Playwright injects it into a page. */
function pinnedPage(): { Date: DateConstructor; Math: Math } {
  const page = vm.createContext({});
  vm.runInContext(`(${pinClockAndRandom.toString()})(${JSON.stringify({ recordedAt: RECORDED_AT, seed: SEED })})`, page);
  return vm.runInContext('({ Date, Math })', page);
}

test('the page clock starts at the recording time', () => {
  const page = pinnedPage();

  assert.ok(Math.abs(page.Date.now() - RECORDED_AT) < 1000);
  assert.ok(Math.abs(new page.Date().getTime() - RECORDED_AT) < 1000);
});

test('explicit dates and Date() without new behave like the real Date', () => {
  const page = pinnedPage();

  assert.equal(new page.Date(0).getTime(), 0);
  assert.equal(typeof (page.Date as unknown as () => string)(), 'string');
  assert.ok(new page.Date(0) instanceof page.Date);
});

test('two pages with the same seed draw the same random numbers', () => {
  const draws = () => {
    const page = pinnedPage();
    return [page.Math.random(), page.Math.random()];
  };

  assert.deepEqual(draws(), draws());
});
