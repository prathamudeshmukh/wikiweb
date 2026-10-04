import type { Analytics } from '../analytics/analytics';
import type { CardTopic } from '../content/topics';
import type { ExhaustedNode } from '../content/nodeStream';
import type { CompletedNodes } from '../interests/completedNodes';
import { reportError } from '../services/reportError';
import { countRead, type Nudge, promptTileFor } from './nudgeRules';
import type { NudgeProgress, NudgeStore } from './nudgeStore';

/**
 * Decides which nudge card Home shows (SPEC.md §3.9): an exhaustion card the first time a node runs dry, else a
 * prompt for a broadly picked tree tile after enough reads — once per tile, at most one per app session.
 */
export interface Nudges {
  load(): Promise<void>;
  /** An article was read; its topic counts towards its tile's prompt. */
  articleRead(topic: CardTopic | null): Promise<void>;
  /** Home found every article of a node read. */
  nodeExhausted(node: ExhaustedNode): Promise<void>;
  /** The nudge Home should show next, if any. */
  next(picks: readonly string[]): Nudge | null;
  /** The nudge dwelt on screen. */
  shown(nudge: Nudge): void;
  dismissed(nudge: Nudge, how: 'swipe' | 'scrolled_past'): void;
  subscribe(listener: () => void): () => void;
  /** Resolves once every write so far has been saved. */
  whenSaved(): Promise<void>;
}

interface NudgesDeps {
  store: NudgeStore;
  completedNodes: CompletedNodes;
  analytics: Analytics;
  now: () => number;
}

export function createNudges({ store, completedNodes, analytics, now }: NudgesDeps): Nudges {
  let progress: NudgeProgress = { promptsSeen: [], readsByTile: {} };
  let promptShownThisSession = false;
  let pendingExhausted: readonly ExhaustedNode[] = [];
  let listeners: readonly (() => void)[] = [];
  let saving: Promise<void> = Promise.resolve();

  const notify = () => listeners.forEach((listener) => listener());
  const persist = (next: NudgeProgress) => {
    progress = next;
    saving = saving.then(() => store.save(next)).catch((error: unknown) => reportError('nudges.save', error));
    return saving;
  };

  return {
    async load() {
      progress = await store.load();
    },
    async articleRead(topic) {
      const readsByTile = countRead(progress.readsByTile, topic?.tileId ?? null);
      if (readsByTile !== progress.readsByTile) await persist({ ...progress, readsByTile });
    },
    async nodeExhausted(node) {
      const isNew = await completedNodes.record({ nodePath: node.path, completedAt: now(), articleCount: node.articleCount });
      if (!isNew) return;
      analytics.track({ name: 'niche_node_exhausted', properties: { node: node.path, articles: node.articleCount } });
      pendingExhausted = [...pendingExhausted, node];
      notify();
    },
    next(picks) {
      const [exhausted] = pendingExhausted;
      if (exhausted) return { kind: 'exhausted', node: exhausted };
      if (promptShownThisSession) return null;
      const tileId = promptTileFor({ picks, ...progress });
      return tileId ? { kind: 'prompt', tileId, reads: progress.readsByTile[tileId] ?? 0 } : null;
    },
    shown(nudge) {
      if (nudge.kind === 'exhausted') {
        pendingExhausted = pendingExhausted.filter((node) => node.path !== nudge.node.path);
        return;
      }
      if (promptShownThisSession && progress.promptsSeen.includes(nudge.tileId)) return;
      promptShownThisSession = true;
      analytics.track({ name: 'niche_prompt_shown', properties: { tile: nudge.tileId } });
      void persist({ ...progress, promptsSeen: [...progress.promptsSeen, nudge.tileId] });
    },
    dismissed(nudge, how) {
      if (nudge.kind === 'prompt') analytics.track({ name: 'niche_prompt_dismissed', properties: { tile: nudge.tileId, how } });
    },
    subscribe(listener) {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
    whenSaved: () => saving,
  };
}
