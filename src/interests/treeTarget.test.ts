import { parseTreeTarget, treeHref, treeTargetForNode } from './treeTarget';

describe('parseTreeTarget', () => {
  it('accepts a tile with a tree and a subfield in it', () => {
    expect(parseTreeTarget('philosophy', 'ethics')).toEqual({ tileId: 'philosophy', subfieldId: 'ethics' });
  });

  it('drops an unknown subfield but keeps the tile', () => {
    expect(parseTreeTarget('philosophy', 'astrology')).toEqual({ tileId: 'philosophy' });
  });

  it('rejects a tile without a tree, or no tile', () => {
    expect(parseTreeTarget('music', undefined)).toBeNull();
    expect(parseTreeTarget(['philosophy'], undefined)).toBeNull();
  });
});

describe('treeTargetForNode', () => {
  it("opens a leaf at its parent subfield", () => {
    expect(treeTargetForNode('philosophy/ethics/stoicism')).toEqual({ tileId: 'philosophy', subfieldId: 'ethics' });
  });

  it('opens a subfield at itself', () => {
    expect(treeTargetForNode('maths/logic')).toEqual({ tileId: 'maths', subfieldId: 'logic' });
  });
});

describe('treeHref', () => {
  it('links to the interests route with the tree in its params', () => {
    expect(treeHref({ tileId: 'maths', subfieldId: 'logic' })).toEqual({ pathname: '/settings/interests', params: { tile: 'maths', subfield: 'logic' } });
  });
});
