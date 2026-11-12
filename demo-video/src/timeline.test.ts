import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTimeline } from './timeline.ts';

test('a well-formed timeline passes through', () => {
  const timeline = parseTimeline({ durationMs: 24000, beats: { hook: 0, links: 2800 } });

  assert.deepEqual(timeline, { durationMs: 24000, beats: { hook: 0, links: 2800 } });
});

test('a missing capture is reported with what to run', () => {
  assert.throws(() => parseTimeline(null), /npm run capture/);
});

test('a beat that is not a time is rejected', () => {
  assert.throws(() => parseTimeline({ durationMs: 1000, beats: { hook: 'soon' } }), /not a time/);
});
