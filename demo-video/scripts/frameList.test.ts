import assert from 'node:assert/strict';
import { test } from 'node:test';
import { concatList } from './frameList.ts';

const FRAMES = [
  { file: '000001.jpg', timestamp: 10 },
  { file: '000002.jpg', timestamp: 10.5 },
];

test('each frame lasts until the next one, and the last until the take ends', () => {
  const list = concatList(FRAMES, 12);

  assert.match(list, /000001\.jpg'\nduration 0\.5000/);
  assert.match(list, /000002\.jpg'\nduration 1\.5000/);
});

test('the last frame is listed twice so ffmpeg honours its duration', () => {
  const list = concatList(FRAMES, 12);

  assert.equal(list.match(/000002\.jpg/g)?.length, 2);
});

test('a take with no frames is an error, not an empty video', () => {
  assert.throws(() => concatList([], 1), /No screencast frames/);
});
