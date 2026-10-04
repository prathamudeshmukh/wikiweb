import type { ViewToken } from 'react-native';
import type { Card } from '../content/card';

/** One row of a column's list: a card, or Home's nudge card (SPEC.md §3.9). */
export type ColumnItem = { kind: 'card'; card: Card; position: number } | { kind: 'nudge' };

const NUDGE_ITEM: ColumnItem = { kind: 'nudge' };

/**
 * The cards with the nudge placed at `nudgeIndex` (clamped to the end). Card positions count cards only, so
 * `card_seen` positions don't shift around a nudge. No nudge before the first card: Home opens on an article.
 */
export function columnItems(cards: readonly Card[], nudgeIndex: number | null): ColumnItem[] {
  const items: ColumnItem[] = cards.map((card, position) => ({ kind: 'card', card, position }));
  if (nudgeIndex === null || cards.length === 0) return items;
  const at = Math.min(nudgeIndex, items.length);
  return [...items.slice(0, at), NUDGE_ITEM, ...items.slice(at)];
}

/** List viewability tokens → card tokens indexed by card position. */
export function cardTokens(tokens: readonly ViewToken<ColumnItem>[]): ViewToken<Card>[] {
  return tokens.flatMap((token) => (token.item.kind === 'card' ? [{ ...token, item: token.item.card, index: token.item.position }] : []));
}

/** Whether the nudge became visible (true) or stopped being visible (false); null when it didn't change. */
export function nudgeVisibility(changed: readonly ViewToken<ColumnItem>[]): boolean | null {
  const token = changed.find((t) => t.item.kind === 'nudge');
  return token ? token.isViewable : null;
}
