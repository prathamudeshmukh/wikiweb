import assert from 'node:assert/strict';
import { test } from 'node:test';
import { easeInOutCubic, strokePoints } from './gesturePath.ts';

const SWIPE = { from: { x: 300, y: 450 }, to: { x: 60, y: 450 }, durationMs: 320 };

test('easing starts at 0, ends at 1 and passes the midpoint at half time', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
});

test('a stroke emits one point per 16 ms frame and lands exactly on its target', () => {
  const points = strokePoints(SWIPE);

  assert.equal(points.length, 20);
  assert.deepEqual(points.at(-1), { x: 60, y: 450 });
});

test('a stroke shorter than a frame still moves the pointer once', () => {
  const points = strokePoints({ ...SWIPE, durationMs: 0 });

  assert.equal(points.length, 1);
});
