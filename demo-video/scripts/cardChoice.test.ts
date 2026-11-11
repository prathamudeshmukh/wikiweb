import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chooseCard, isFresh } from './cardChoice.ts';

const PATH = ['Banksia brownii', 'Banksia subg. Banksia'];

test('a title sharing a significant word with the path is not fresh', () => {
  assert.equal(isFresh('Banksia ilicifolia', PATH), false);
  assert.equal(isFresh('Honey possum', PATH), true);
});

test('takes the first fresh card with a photo, skipping siblings and text-only cards', () => {
  const candidates = [
    { title: 'Banksia ilicifolia', hasPhoto: true },
    { title: 'Western Australia', hasPhoto: false },
    { title: 'Honey possum', hasPhoto: true },
  ];

  assert.equal(chooseCard(candidates, PATH), 2);
});

test('falls back to the first photo, then to the top card', () => {
  const siblings = [
    { title: 'Banksia text', hasPhoto: false },
    { title: 'Banksia photo', hasPhoto: true },
  ];

  assert.equal(chooseCard(siblings, PATH), 1);
  assert.equal(chooseCard([{ title: 'Banksia text', hasPhoto: false }], PATH), 0);
});
