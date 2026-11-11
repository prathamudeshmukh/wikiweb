import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toTimeline } from './timeline.ts';

const TAKE = {
  frames: [
    { file: 'a.jpg', timestamp: 100 },
    { file: 'b.jpg', timestamp: 101 },
  ],
  beats: [
    { id: 'hook', timestamp: 99.9 },
    { id: 'links', timestamp: 102.25 },
  ],
  endTimestamp: 110,
};

test('beats and duration are measured from the first frame', () => {
  const timeline = toTimeline(TAKE);

  assert.equal(timeline.durationMs, 10_000);
  assert.equal(timeline.beats.links, 2250);
});

test('a beat marked just before the first frame starts at zero', () => {
  assert.equal(toTimeline(TAKE).beats.hook, 0);
});

test('a take with no frames has no timeline', () => {
  assert.throws(() => toTimeline({ ...TAKE, frames: [] }), /No screencast frames/);
});
