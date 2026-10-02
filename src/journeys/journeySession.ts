import type { CardTopic } from '../content/topics';
import type { PageRef } from '../wiki-api/types';
import { journeyTitle } from './expedition';
import type { JourneyRepository } from './journeyRepository';
import type { Expedition, JourneyNode, NodePage, NodeVia, Stamp } from './journeyTypes';

export interface JourneySessionState {
  /** The expedition under way; null on Home. */
  active: Expedition | null;
  /** Every article ever opened in the reader. */
  readIds: ReadonlySet<number>;
  stampTileIds: ReadonlySet<string>;
}

export interface HopRecord {
  /** The node of the column (or in-place read) the hop left from; null from Home. */
  fromNodeId: string | null;
  page: NodePage;
  via: Exclude<NodeVia, 'peek_read'>;
}

export interface Logbook {
  expeditions: readonly Expedition[];
  stamps: readonly Stamp[];
}

/**
 * The live Journey (SPEC.md §3.5, §9). Updates are synchronous and immutable so the UI never waits on
 * storage; writes go to the repository in order behind the scenes.
 */
export interface JourneySession {
  getState(): JourneySessionState;
  subscribe(listener: () => void): () => void;
  /** Loads read history and stamps; call once at startup. */
  load(): Promise<void>;
  /** The node of the column now on top; null means Home, which ends the expedition. */
  focus(nodeId: string | null): void;
  focusedNodeId(): string | null;
  /** Records a hop, starting a new expedition when it leaves from Home. */
  hop(record: HopRecord): JourneyNode;
  /** Records an article read in place from a peek card; null when there is no expedition to add it to. */
  peekRead(fromNodeId: string | null, page: NodePage): JourneyNode | null;
  /** Marks an article read and stamps its topic if it's new. Pass the topic only when it's known (not a fallback). */
  markRead(page: PageRef, knownTopic: CardTopic | null): void;
  /** Makes a saved expedition the active one again. */
  resume(journeyId: string): Promise<Expedition | null>;
  logbook(): Promise<Logbook>;
  expedition(journeyId: string): Promise<Expedition | null>;
  /** Whether the user has ever hopped, including hops still being saved. */
  hasExplored(): Promise<boolean>;
  /** Resolves once every write so far has been saved (or reported as failed). */
  whenSaved(): Promise<void>;
}

export interface JourneySessionDeps {
  repo: JourneyRepository;
  now: () => number;
  newId: () => string;
  /** Looks up an article's topic for stamps when the reader doesn't know it. */
  resolveTopic: (pageId: number) => Promise<CardTopic>;
  onError: (scope: string, error: unknown) => void;
}

const EMPTY_STATE: JourneySessionState = { active: null, readIds: new Set(), stampTileIds: new Set() };

const withNode = (expedition: Expedition, node: JourneyNode): Expedition => ({
  ...expedition,
  journey: { ...expedition.journey, lastNodeId: node.id, updatedAt: node.createdAt },
  nodes: [...expedition.nodes, node],
});

export function createJourneySession({ repo, now, newId, resolveTopic, onError }: JourneySessionDeps): JourneySession {
  let state = EMPTY_STATE;
  let focused: string | null = null;
  let saving: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  const setState = (next: JourneySessionState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const persist = (scope: string, write: () => Promise<unknown>) => {
    saving = saving.then(write).then(
      () => undefined,
      (error: unknown) => onError(scope, error),
    );
  };

  const nodeIn = (expedition: Expedition | null, nodeId: string | null) =>
    nodeId !== null && expedition?.nodes.some((node) => node.id === nodeId) === true;

  function startExpedition(firstTitle: string): Expedition {
    const at = now();
    const journey = { id: newId(), title: journeyTitle(firstTitle), createdAt: at, updatedAt: at, lastNodeId: null };
    persist('journeys.create', () => repo.createJourney(journey));
    return { journey, nodes: [], readIds: new Set() };
  }

  function addNode(expedition: Expedition, parentNodeId: string | null, page: NodePage, via: NodeVia): JourneyNode {
    const node: JourneyNode = { ...page, id: newId(), journeyId: expedition.journey.id, parentNodeId, via, createdAt: now() };
    persist('journeys.node', () => repo.addNode(node));
    setState({ ...state, active: withNode(expedition, node) });
    return node;
  }

  function awardStamp(pageId: number, topic: CardTopic) {
    const { tileId } = topic;
    if (!tileId || state.stampTileIds.has(tileId)) return;
    setState({ ...state, stampTileIds: new Set([...state.stampTileIds, tileId]) });
    persist('journeys.stamp', () => repo.awardStamp({ tileId, pageId, earnedAt: now() }));
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async load() {
      const [readIds, stamps] = await Promise.all([repo.readPageIds(), repo.stamps()]);
      // Reads and stamps may already have happened while loading; keep them.
      setState({
        ...state,
        readIds: new Set([...readIds, ...state.readIds]),
        stampTileIds: new Set([...stamps.map((stamp) => stamp.tileId), ...state.stampTileIds]),
      });
    },

    focus(nodeId) {
      focused = nodeId;
      if (nodeId === null && state.active) setState({ ...state, active: null });
    },

    focusedNodeId: () => focused,

    hop({ fromNodeId, page, via }) {
      // A hop from Home — or from a node this expedition doesn't know — sets off on a new expedition.
      const continuing = nodeIn(state.active, fromNodeId);
      const expedition = continuing && state.active ? state.active : startExpedition(page.title);
      return addNode(expedition, continuing ? fromNodeId : null, page, via);
    },

    peekRead(fromNodeId, page) {
      if (!state.active || !nodeIn(state.active, fromNodeId)) return null;
      return addNode(state.active, fromNodeId, page, 'peek_read');
    },

    markRead(page, knownTopic) {
      const at = now();
      const { active } = state;
      setState({
        ...state,
        readIds: new Set([...state.readIds, page.pageId]),
        active: active && { ...active, readIds: new Set([...active.readIds, page.pageId]) },
      });
      persist('journeys.read', () => repo.recordRead({ pageId: page.pageId, at, journeyId: active?.journey.id ?? null }));

      if (knownTopic) {
        awardStamp(page.pageId, knownTopic);
        return;
      }
      resolveTopic(page.pageId).then(
        (topic) => awardStamp(page.pageId, topic),
        (error: unknown) => onError('journeys.stampTopic', error),
      );
    },

    async resume(journeyId) {
      await saving;
      const expedition = await repo.expedition(journeyId);
      if (expedition) setState({ ...state, active: expedition });
      return expedition;
    },

    async logbook() {
      await saving;
      const [expeditions, stamps] = await Promise.all([repo.expeditions(), repo.stamps()]);
      return { expeditions, stamps };
    },

    async expedition(journeyId) {
      await saving;
      return repo.expedition(journeyId);
    },

    async hasExplored() {
      await saving;
      return repo.hasNodes();
    },

    whenSaved: () => saving,
  };
}
