import { nodeQuery, resolvePick } from '../interests/interestPicks';
import { INTEREST_TREES } from './interestTree';
import { TOPIC_TILES } from './topicTiles';

// CirrusSearch rejects queries longer than this.
const MAX_QUERY_LENGTH = 300;

const allPaths = Object.entries(INTEREST_TREES).flatMap(([tileId, subfields]) =>
  subfields.flatMap((subfield) => [`${tileId}/${subfield.id}`, ...subfield.leaves.map((leaf) => `${tileId}/${subfield.id}/${leaf.id}`)]),
);

describe('interest trees (SPEC.md §5.5)', () => {
  it('only grows below real tiles', () => {
    const tileIds = TOPIC_TILES.map((tile) => tile.id);

    expect(Object.keys(INTEREST_TREES).filter((id) => !tileIds.includes(id))).toEqual([]);
  });

  it('gives every node an id unique among its siblings', () => {
    expect(new Set(allPaths).size).toBe(allPaths.length);
  });

  it('resolves every node exactly', () => {
    expect(allPaths.filter((path) => resolvePick(path)?.fellBack !== false)).toEqual([]);
  });

  it('searches every node shallow, within the query length limit', () => {
    const queries = allPaths.map((path) => nodeQuery(resolvePick(path)!.pick) ?? '');

    expect(queries.filter((q) => q.includes('deepcat:') || !q.startsWith('incategory:') || q.length > MAX_QUERY_LENGTH)).toEqual([]);
  });

  it('gives every subfield three sample articles', () => {
    const subfields = Object.values(INTEREST_TREES).flat();

    expect(subfields.filter((s) => s.examples.length !== 3 || s.examples.some((e) => !e.trim()))).toEqual([]);
  });
});
