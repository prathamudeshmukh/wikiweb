import { TOPIC_TILES, type Territory } from '../config/topicTiles';
import type { CompletedNode } from '../interests/completedNodes';
import { trailAbove } from '../interests/interestPicks';
import type { Recap } from '../journeys/expedition';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** `1 OCT` — the logbook's date stamp, in local time. */
export function logDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** DESIGN.md §8: `{n} tangents · {r} read`. */
export function recapCounts(recap: Pick<Recap, 'tangents' | 'reads'>): string {
  return `${plural(recap.tangents, 'tangent', 'tangents')} · ${recap.reads} read`;
}

export function tangentCount(count: number): string {
  return plural(count, 'TANGENT', 'TANGENTS');
}

/** The territories a route crossed, in order of first visit — the labels under a recap's route strip. */
export function territoriesCrossed(route: readonly (Territory | null)[]): Territory[] {
  return [...new Set(route.filter((territory): territory is Territory => territory !== null))];
}

const TILE_LABELS: ReadonlyMap<string, string> = new Map(TOPIC_TILES.map((tile) => [tile.id, tile.label]));

export function tileLabel(tileId: string): string {
  return TILE_LABELS.get(tileId) ?? tileId;
}

/** A small, stable tilt per topic so a page of stamps looks hand-pressed (DESIGN.md §5.7: −8° to +8°). */
export function stampTiltDeg(tileId: string): number {
  const MAX_TILT = 8;
  const hash = [...tileId].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 997, 7);
  return (hash % (MAX_TILT * 2 + 1)) - MAX_TILT;
}

/** DESIGN.md §6.5: `{TILE} › {PARENT} · {n} ARTICLES · {DATE}`. */
export function completedCaption({ nodePath, articleCount, completedAt }: CompletedNode): string {
  return `${trailAbove(nodePath)} · ${articleCount} articles · ${logDate(completedAt)}`.toUpperCase();
}
