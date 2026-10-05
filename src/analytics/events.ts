import type { CardSource } from '../content/card';
import type { Territory } from '../config/topicTiles';
import type { FindFrom } from '../finds/findTypes';

/**
 * Every event Tangent sends (SPEC.md §11). Article titles appear only on the feed-quality events
 * (`card_seen`, `column_left`, `hop`, `return`, `read_open`) and only for the seed and the card acted on.
 */

export type HopRoute = 'swipe' | 'tangent';
export type ReturnRoute = 'swipe' | 'crumb' | 'system_back';
/** Why a column stopped being the one on top. `replaced` means another column took over without a recorded reason. */
export type ColumnOutcome = 'hop' | ReturnRoute | 'refresh' | 'resume' | 'background' | 'replaced';
export type ExpeditionEnd = 'home' | 'background';

/** The column an event happened in. Home has no seed and depth 0. */
export interface ColumnProperties {
  seed_title: string | null;
  depth: number;
}

export interface CardProperties {
  card_title: string;
  source: CardSource;
  topic: string | null;
  territory: Territory | null;
  /** 0-based place in its column; null when the card wasn't seen in one (a tangent from the reader). */
  position: number | null;
  /** At or above the hub threshold of incoming links; null when unknown. */
  hub: boolean | null;
}

export interface ColumnSummary extends ColumnProperties {
  outcome: ColumnOutcome;
  cards_seen: number;
  /** Deepest 0-based position seen; null when no card was seen. */
  deepest_position: number | null;
  reads: number;
  seconds: number;
  /** How the feed had ended by the time the column was left, if it had. */
  feed_end: 'dead_end' | 'error' | null;
}

export interface ExpeditionSummary {
  expedition_id: string;
  ended_by: ExpeditionEnd;
  node_count: number;
  max_depth: number;
  reads: number;
  duration_s: number;
  territories: number;
  stamps_earned: number;
}

/** Where interest picks were saved from (SPEC.md §11). */
export type InterestsSavedFrom = 'onboarding' | 'settings' | 'prompt' | 'exhaustion';
/** Where an interest tree was opened from. */
export type TreeOpenedFrom = 'settings' | 'prompt' | 'topic_label' | 'completed';

export interface InterestsSaved {
  from: InterestsSavedFrom;
  tiles: number;
  subfields: number;
  leaves: number;
  /** Path ids added by this save. */
  added: string[];
}

export type AnalyticsEvent =
  | { name: 'card_seen'; properties: CardProperties & ColumnProperties & { interest_node: string | null } }
  | { name: 'column_left'; properties: ColumnSummary }
  | { name: 'hop'; properties: CardProperties & ColumnProperties & { route: HopRoute } }
  | { name: 'return'; properties: ColumnProperties & { route: ReturnRoute; columns_popped: number } }
  | { name: 'read_open'; properties: (CardProperties & ColumnProperties & { entry: 'card' }) | { entry: 'peek_read'; card_title: string } }
  | { name: 'expedition_ended'; properties: ExpeditionSummary }
  | { name: 'stamp_earned'; properties: { topic: string; territory: Territory | null } }
  | { name: 'first_hop'; properties: { route: HopRoute; peels_seen: number; seconds_on_home: number } }
  | { name: 'first_return'; properties: { route: ReturnRoute } }
  | { name: 'interests_saved'; properties: InterestsSaved }
  | { name: 'interest_tree_opened'; properties: { tile: string; from: TreeOpenedFrom } }
  | { name: 'niche_prompt_shown'; properties: { tile: string } }
  | { name: 'niche_prompt_dismissed'; properties: { tile: string; how: 'swipe' | 'scrolled_past' } }
  | { name: 'niche_node_exhausted'; properties: { node: string; articles: number } }
  | { name: 'find_kept'; properties: { from: FindFrom; topic: string | null; territory: Territory | null; on_expedition: boolean } }
  | { name: 'find_removed'; properties: { from: FindFrom } }
  | { name: 'find_restored'; properties: Record<string, never> }
  | { name: 'app_error'; properties: { scope: string; reason: string } };

export type AnalyticsEventName = AnalyticsEvent['name'];
