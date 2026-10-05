import { T0 } from '../journeys/__testing__/journeyFactories';
import { makeFind } from './__testing__/findFactories';
import { cardFromFind, findCaption, findSheetCaption } from './findFormat';

describe('find captions', () => {
  it('names the expedition a find was made on', () => {
    expect(findCaption(makeFind('Squid', { expedition: { id: 'j1', title: 'From Octopus' } }))).toBe('FOUND ON · FROM OCTOPUS…');
  });

  it('says when a find was made on Home', () => {
    expect(findCaption(makeFind('Gamelan'))).toBe('FOUND ON HOME');
  });

  it('dates the find on its sheet', () => {
    expect(findSheetCaption(makeFind('Gamelan', { foundAt: T0 }))).toBe('FOUND ON HOME · 1 OCT');
  });
});

describe('cardFromFind', () => {
  it('flies a find into a new column with its own topic and picture', () => {
    const card = cardFromFind(makeFind('Octopus', { thumbnailUrl: 'https://img/octopus.jpg' }));

    expect(card).toMatchObject({ title: 'Octopus', topic: { tileId: 'animals', territory: 'life' }, topicIsFallback: false, thumbnail: { url: 'https://img/octopus.jpg' } });
  });

  it('treats an untagged find’s topic as unknown, so the column resolves it', () => {
    expect(cardFromFind(makeFind('Gamelan', { tileId: null, territory: null })).topicIsFallback).toBe(true);
  });
});
