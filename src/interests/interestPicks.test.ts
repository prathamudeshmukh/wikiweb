import {
  addPick,
  hasTree,
  nodeLabel,
  nodeQuery,
  normalisePicks,
  parentPath,
  picksBelow,
  removePick,
  resolvePick,
  tilesTouched,
  togglePick,
  widenedPath,
} from './interestPicks';

describe('resolvePick', () => {
  it('resolves a plain tile id to a broad pick', () => {
    const resolved = resolvePick('philosophy');

    expect(resolved?.pick).toMatchObject({ path: 'philosophy', subfield: null, leaf: null });
    expect(resolved?.fellBack).toBe(false);
  });

  it('resolves a leaf path to its subfield and leaf', () => {
    const resolved = resolvePick('philosophy/ethics/stoicism');

    expect(resolved?.pick.subfield?.id).toBe('ethics');
    expect(resolved?.pick.leaf?.id).toBe('stoicism');
  });

  it('falls back to the nearest existing ancestor when a node is gone', () => {
    const resolved = resolvePick('philosophy/ethics/hedonism');

    expect(resolved?.pick.path).toBe('philosophy/ethics');
    expect(resolved?.fellBack).toBe(true);
  });

  it('never resolves below tile level for an unknown subfield', () => {
    expect(resolvePick('history/astrology/tarot')?.pick.path).toBe('history');
  });

  it('returns null for an unknown tile', () => {
    expect(resolvePick('astrology')).toBeNull();
  });

  it('treats a node below a tile without a tree as gone', () => {
    expect(resolvePick('space/planets')?.pick.path).toBe('space');
  });
});

describe('node label and query', () => {
  it('labels a node by its most specific part', () => {
    expect(nodeLabel(resolvePick('philosophy/ethics/stoicism')!.pick)).toBe('Stoicism');
    expect(nodeLabel(resolvePick('philosophy/ethics')!.pick)).toBe('Ethics');
    expect(nodeLabel(resolvePick('philosophy')!.pick)).toBe('Philosophy');
  });

  it('has no node query for a broad tile', () => {
    expect(nodeQuery(resolvePick('philosophy')!.pick)).toBeNull();
  });

  it('searches a leaf by its category, shallow', () => {
    expect(nodeQuery(resolvePick('philosophy/ethics/virtue-ethics')!.pick)).toBe('incategory:Virtue_ethics');
  });

  it("searches a subfield across its own and its leaves' categories", () => {
    const query = nodeQuery(resolvePick('philosophy/political')!.pick);

    expect(query).toBe('incategory:Political_philosophy|Anarchism|Liberalism');
  });
});

describe('paths', () => {
  it('finds the parent of a node, and none above a tile', () => {
    expect(parentPath('philosophy/ethics/stoicism')).toBe('philosophy/ethics');
    expect(parentPath('philosophy')).toBeNull();
  });

  it('widens a leaf to its subfield, then to its tile', () => {
    expect(widenedPath('philosophy/ethics/stoicism')).toBe('philosophy/ethics');
    expect(widenedPath('philosophy/ethics')).toBe('philosophy');
  });

  it('knows which tiles have a tree', () => {
    expect(hasTree('maths')).toBe(true);
    expect(hasTree('music')).toBe(false);
  });
});

describe('picking: the most specific pick wins', () => {
  it('replaces the ancestor when a child is picked', () => {
    expect(addPick(['space', 'philosophy'], 'philosophy/logic')).toEqual(['space', 'philosophy/logic']);
  });

  it('replaces descendants when their ancestor is picked', () => {
    expect(addPick(['philosophy/logic/paradoxes', 'philosophy/ethics'], 'philosophy')).toEqual(['philosophy']);
  });

  it('replaces a subfield when one of its leaves is picked', () => {
    expect(addPick(['philosophy/logic'], 'philosophy/logic/paradoxes')).toEqual(['philosophy/logic/paradoxes']);
  });

  it('keeps sibling picks', () => {
    expect(addPick(['philosophy/logic'], 'philosophy/ethics')).toEqual(['philosophy/logic', 'philosophy/ethics']);
  });

  it('does not add a pick twice', () => {
    expect(addPick(['philosophy/logic'], 'philosophy/logic')).toEqual(['philosophy/logic']);
  });

  it('leaves the tile unpicked when its last pick below is cleared', () => {
    expect(removePick(['space', 'philosophy/logic'], 'philosophy/logic')).toEqual(['space']);
  });

  it('toggles a pick on and off', () => {
    expect(togglePick(['space'], 'philosophy/ethics')).toEqual(['space', 'philosophy/ethics']);
    expect(togglePick(['space', 'philosophy/ethics'], 'philosophy/ethics')).toEqual(['space']);
  });

  it('never changes the array it was given', () => {
    const picks = Object.freeze(['philosophy']);

    addPick(picks, 'philosophy/logic');

    expect(picks).toEqual(['philosophy']);
  });

  it('lists the picks below a node', () => {
    expect(picksBelow(['philosophy/logic', 'philosophy/ethics/stoicism', 'space'], 'philosophy')).toEqual(['philosophy/logic', 'philosophy/ethics/stoicism']);
  });
});

describe('tilesTouched', () => {
  it('counts a tile once however many picks sit below it', () => {
    expect(tilesTouched(['philosophy/logic', 'philosophy/ethics/stoicism', 'space', 'music'])).toBe(3);
  });

  it('counts nothing for no picks', () => {
    expect(tilesTouched([])).toBe(0);
  });
});

describe('normalisePicks', () => {
  it('resolves gone nodes to their ancestors and reports each fallback', () => {
    const result = normalisePicks(['space', 'philosophy/ethics/hedonism']);

    expect(result.picks).toEqual(['space', 'philosophy/ethics']);
    expect(result.fellBack).toEqual(['philosophy/ethics/hedonism']);
  });

  it('drops unknown tiles', () => {
    expect(normalisePicks(['astrology', 'art']).picks).toEqual(['art']);
  });

  it('drops an ancestor that a fallback created next to a more specific pick', () => {
    expect(normalisePicks(['philosophy/logic/gone', 'philosophy/logic/paradoxes']).picks).toEqual(['philosophy/logic/paradoxes']);
  });
});
