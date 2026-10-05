import type { FindEvents } from '../finds/findsStore';
import type { Analytics } from './analytics';

/** `find_*` events (SPEC.md §11): topic and origin only — finds are titles, and titles stay off these events. */
export function findEvents(analytics: Analytics): FindEvents {
  return {
    kept: (find, from) =>
      analytics.track({ name: 'find_kept', properties: { from, topic: find.tileId, territory: find.territory, on_expedition: find.expedition !== null } }),
    removed: (_find, from) => analytics.track({ name: 'find_removed', properties: { from } }),
    restored: () => analytics.track({ name: 'find_restored', properties: {} }),
  };
}
