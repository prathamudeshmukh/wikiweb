import { TOPIC_TILES } from '../config/topicTiles';
import { completedCaption, logDate, recapCounts, stampTiltDeg, tangentCount, territoriesCrossed, tileLabel } from './logbookFormat';

describe('logbook format', () => {
  it('dates an expedition like a log entry', () => {
    expect(logDate(new Date(2026, 9, 1, 15, 30).getTime())).toBe('1 OCT');
  });

  it('counts tangents and reads', () => {
    expect(recapCounts({ tangents: 7, reads: 3 })).toBe('7 tangents · 3 read');
    expect(recapCounts({ tangents: 1, reads: 0 })).toBe('1 tangent · 0 read');
    expect(tangentCount(1)).toBe('1 TANGENT');
  });

  it('lists each territory a route crossed once, in order', () => {
    expect(territoriesCrossed(['life', null, 'life', 'earth', 'past', 'earth'])).toEqual(['life', 'earth', 'past']);
  });

  it('names topics by their tile label', () => {
    expect(tileLabel('film')).toBe('Film & TV');
    expect(tileLabel('unknown')).toBe('unknown');
  });

  it('tilts every stamp within ±8°, the same way each time', () => {
    const tilts = TOPIC_TILES.map((tile) => stampTiltDeg(tile.id));

    expect(Math.max(...tilts.map(Math.abs))).toBeLessThanOrEqual(8);
    expect(stampTiltDeg('maths')).toBe(stampTiltDeg('maths'));
    expect(new Set(tilts).size).toBeGreaterThan(5);
  });
});

describe('completedCaption', () => {
  it('reads like DESIGN.md §6.5 for a leaf', () => {
    expect(completedCaption({ nodePath: 'philosophy/ethics/stoicism', completedAt: new Date(2026, 9, 4).getTime(), articleCount: 37 })).toBe(
      'PHILOSOPHY › ETHICS · 37 ARTICLES · 4 OCT',
    );
  });

  it('names only the tile for a subfield', () => {
    expect(completedCaption({ nodePath: 'maths/logic', completedAt: new Date(2026, 8, 28).getTime(), articleCount: 379 })).toBe('MATHS · 379 ARTICLES · 28 SEP');
  });
});
