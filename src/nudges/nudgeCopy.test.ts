import { nudgeCopy } from './nudgeCopy';

describe('nudgeCopy (DESIGN.md §8)', () => {
  it('asks to narrow a tile on the prompt card', () => {
    const copy = nudgeCopy({ kind: 'prompt', tileId: 'philosophy', reads: 4 });

    expect([copy.eyebrow, copy.title, copy.metaRight]).toEqual(['You keep reading Philosophy', 'Narrow Philosophy?', '4 read']);
  });

  it('names an exhausted leaf, its count and where Home widens to', () => {
    const copy = nudgeCopy({ kind: 'exhausted', node: { path: 'philosophy/ethics/stoicism', articleCount: 37 } });

    expect([copy.eyebrow, copy.title, copy.metaRight]).toEqual(['Philosophy › Ethics', "You've read all of Stoicism", '37 articles']);
    expect(copy.body).toBe('Every one of them. Home widens to Ethics from here. Or try a neighbour:');
  });

  it('widens an exhausted subfield to all of its tile', () => {
    const copy = nudgeCopy({ kind: 'exhausted', node: { path: 'philosophy/ancient', articleCount: 75 } });

    expect(copy.eyebrow).toBe('Philosophy');
    expect(copy.body).toBe('Every one of them. Home widens to all of Philosophy from here. Or try a neighbour:');
    expect(copy.whyLine).toBe('✓ Completed · Philosophy');
  });
});
