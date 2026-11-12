import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chooseCard, isFresh, topicOf } from './cardChoice.ts';

const ROUTE = [
  { title: 'Banksia brownii', topic: 'ANIMALS' },
  { title: 'Banksia subg. Banksia', topic: 'ANIMALS' },
];
const card = (title: string, topic: string | null, hasPhoto = true) => ({ title, topic, hasPhoto });

test('reads the topic label from a card’s text', () => {
  assert.equal(topicOf('TAKE A TANGENT →\nSauropoda\n● ANIMALS · EXTINCT CLADE'), 'ANIMALS');
  assert.equal(topicOf('Untagged article\nSome extract'), null);
});

test('an empty topic label is no topic, not the next line', () => {
  assert.equal(topicOf('Indigenous peoples in Brazil\n●\nIndigenous peoples in Brazil are'), null);
});

test('an untagged card is not a new topic', () => {
  const candidates = [card('Raposa Serra do Sol', null), card('Perth', 'PLACES')];

  assert.equal(chooseCard(candidates, ROUTE), 1);
});

test('a read that must earn a stamp skips untagged cards, even text-only fallbacks', () => {
  const candidates = [card('Raposa Serra do Sol', null), card('Banksia text', 'ANIMALS', false)];

  assert.equal(chooseCard(candidates, ROUTE, { needsTopic: true }), 1);
});

test('a title sharing a significant word with the route is not fresh', () => {
  assert.equal(isFresh('Banksia ilicifolia', ROUTE), false);
  assert.equal(isFresh('Honey possum', ROUTE), true);
});

test('prefers a fresh photo card from a new topic', () => {
  const candidates = [card('Banksia ilicifolia', 'ANIMALS'), card('Honey possum', 'ANIMALS'), card('Perth', 'PLACES')];

  assert.equal(chooseCard(candidates, ROUTE), 2);
});

test('without a new topic, takes the first fresh photo card', () => {
  const candidates = [card('Banksia ilicifolia', 'ANIMALS'), card('Western Australia', 'PLACES', false), card('Honey possum', 'ANIMALS')];

  assert.equal(chooseCard(candidates, ROUTE), 2);
});

test('falls back to the first photo, then to the top card', () => {
  assert.equal(chooseCard([card('Banksia text', null, false), card('Banksia photo', 'ANIMALS')], ROUTE), 1);
  assert.equal(chooseCard([card('Banksia text', null, false)], ROUTE), 0);
});
