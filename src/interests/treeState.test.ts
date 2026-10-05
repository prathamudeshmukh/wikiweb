import { leafState, subfieldState, tileState, treeStatus } from './treeState';

describe('tileState', () => {
  it('is broad when the tile itself is picked', () => {
    expect(tileState(['philosophy', 'space'], 'philosophy')).toEqual({ kind: 'broad' });
  });

  it('is narrowed with a count of the picks below it', () => {
    expect(tileState(['philosophy/logic', 'philosophy/ethics/stoicism'], 'philosophy')).toEqual({ kind: 'narrowed', picks: 2 });
  });

  it('is unpicked otherwise', () => {
    expect(tileState(['space'], 'philosophy')).toEqual({ kind: 'unpicked' });
  });
});

describe('treeStatus', () => {
  it('reads like DESIGN.md §5.13', () => {
    expect(treeStatus(['philosophy'], 'philosophy')).toBe('ALL OF PHILOSOPHY');
    expect(treeStatus(['philosophy/logic'], 'philosophy')).toBe('NARROWED TO 1 CORNER');
    expect(treeStatus(['philosophy/logic', 'philosophy/ethics'], 'philosophy')).toBe('NARROWED TO 2 CORNERS');
    expect(treeStatus([], 'philosophy')).toBe('NOT PICKED');
  });
});

describe('subfieldState', () => {
  it('is picked when the whole subfield is', () => {
    expect(subfieldState(['philosophy/logic'], 'philosophy/logic')).toEqual({ kind: 'picked' });
  });

  it('is partial with a count when leaves below it are picked', () => {
    expect(subfieldState(['philosophy/logic/paradoxes'], 'philosophy/logic')).toEqual({ kind: 'partial', picks: 1 });
  });

  it('is unpicked otherwise', () => {
    expect(subfieldState(['philosophy'], 'philosophy/logic')).toEqual({ kind: 'unpicked' });
  });
});

describe('leafState', () => {
  it('is picked when the leaf itself is', () => {
    expect(leafState(['philosophy/logic/paradoxes'], 'philosophy/logic/paradoxes')).toBe('picked');
  });

  it('is included when its whole subfield is picked', () => {
    expect(leafState(['philosophy/logic'], 'philosophy/logic/paradoxes')).toBe('included');
  });

  it('is unpicked otherwise, even under a broad tile', () => {
    expect(leafState(['philosophy'], 'philosophy/logic/paradoxes')).toBe('unpicked');
  });
});
