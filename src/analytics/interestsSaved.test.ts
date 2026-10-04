import { interestsSavedProperties } from './interestsSaved';

describe('interestsSavedProperties', () => {
  it('counts tiles touched, subfields and leaves after the save, and lists what was added', () => {
    const properties = interestsSavedProperties({
      before: ['space', 'philosophy'],
      after: ['space', 'philosophy/logic', 'philosophy/ethics/stoicism', 'art'],
      from: 'prompt',
    });

    expect(properties).toEqual({ from: 'prompt', tiles: 3, subfields: 1, leaves: 1, added: ['philosophy/logic', 'philosophy/ethics/stoicism', 'art'] });
  });

  it('lists nothing added when picks were only removed', () => {
    expect(interestsSavedProperties({ before: ['space', 'art', 'music', 'food'], after: ['space', 'art', 'music'], from: 'settings' }).added).toEqual([]);
  });
});
