import { chipChoices, countRead, promptTileFor } from './nudgeRules';

const reads = (counts: Record<string, number>) => counts;

describe('promptTileFor', () => {
  it('prompts for a broad tree tile once it has enough reads', () => {
    expect(promptTileFor({ picks: ['philosophy', 'space'], readsByTile: reads({ philosophy: 3 }), promptsSeen: [] })).toBe('philosophy');
  });

  it('waits until the tile has enough reads', () => {
    expect(promptTileFor({ picks: ['philosophy'], readsByTile: reads({ philosophy: 2 }), promptsSeen: [] })).toBeNull();
  });

  it('never prompts for a tile already narrowed', () => {
    expect(promptTileFor({ picks: ['philosophy/logic'], readsByTile: reads({ philosophy: 9 }), promptsSeen: [] })).toBeNull();
  });

  it('never prompts twice for the same tile', () => {
    expect(promptTileFor({ picks: ['philosophy'], readsByTile: reads({ philosophy: 9 }), promptsSeen: ['philosophy'] })).toBeNull();
  });

  it('never prompts for a tile without a tree', () => {
    expect(promptTileFor({ picks: ['music'], readsByTile: reads({ music: 9 }), promptsSeen: [] })).toBeNull();
  });
});

describe('countRead', () => {
  it('counts a read for a tile with a tree, without changing the record it was given', () => {
    const before = Object.freeze({ philosophy: 1 });

    expect(countRead(before, 'philosophy')).toEqual({ philosophy: 2 });
    expect(before).toEqual({ philosophy: 1 });
  });

  it('ignores reads in tiles without a tree, or with no topic', () => {
    expect(countRead({}, 'music')).toEqual({});
    expect(countRead({}, null)).toEqual({});
  });
});

describe('chipChoices', () => {
  it("offers a tile's subfields on its prompt card", () => {
    const chips = chipChoices({ kind: 'prompt', tileId: 'history', reads: 3 }, ['history']);

    expect(chips.map((c) => c.path)).toEqual([
      'history/ancient',
      'history/medieval',
      'history/empires',
      'history/revolutions',
      'history/twentieth-century',
      'history/exploration',
    ]);
  });

  it('offers the siblings of an exhausted leaf that are not already picked', () => {
    const node = { path: 'philosophy/mind/consciousness', articleCount: 127 };

    const chips = chipChoices({ kind: 'exhausted', node }, ['philosophy/mind/consciousness', 'philosophy/mind/ai']);

    expect(chips).toEqual([{ path: 'philosophy/mind/thought-experiments', label: 'Thought experiments' }]);
  });

  it('offers sibling subfields for an exhausted subfield', () => {
    const node = { path: 'philosophy/ancient', articleCount: 75 };

    const chips = chipChoices({ kind: 'exhausted', node }, ['philosophy/ancient']);

    expect(chips.map((c) => c.path)).toContain('philosophy/eastern');
    expect(chips.map((c) => c.path)).not.toContain('philosophy/ancient');
  });
});
