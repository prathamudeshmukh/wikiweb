import type { CardTopic } from '../content/topics';
import type { PageRef } from '../wiki-api/types';
import type { FindRepository } from './findRepository';
import type { Find, FindDetails, FindExpedition, FindFrom, FindPage } from './findTypes';

/** The toast a keep or remove raises (DESIGN.md §8); `id` tells one notice from the next. */
export interface FindNotice {
  id: number;
  kind: 'kept' | 'removed';
  find: Find;
}

export interface FindsState {
  /** Newest first. */
  finds: readonly Find[];
  ids: ReadonlySet<number>;
  notice: FindNotice | null;
}

/**
 * Finds (SPEC.md §3.7). Like the journey session, updates are synchronous and immutable so ✦ fills at once;
 * writes go to the repository in order behind the scenes.
 */
export interface FindsStore {
  getState(): FindsState;
  subscribe(listener: () => void): () => void;
  /** Loads saved finds; call once at startup. */
  load(): Promise<void>;
  /** Keeps the article, or removes it if it's already kept. */
  toggle(page: FindPage, from: FindFrom): void;
  /** Puts back the find the current notice removed, exactly as it was. */
  undo(): void;
  /** Clears the notice if it's still the one with this id. */
  dismiss(noticeId: number): void;
  /** Resolves once every lookup and write so far has finished (or been reported as failed). */
  whenSaved(): Promise<void>;
}

/** Moments analytics cares about. */
export interface FindEvents {
  kept(find: Find, from: FindFrom): void;
  removed(find: Find, from: FindFrom): void;
  restored(find: Find): void;
}

const NO_EVENTS: FindEvents = { kept: () => undefined, removed: () => undefined, restored: () => undefined };

export interface FindsStoreDeps {
  repo: FindRepository;
  now: () => number;
  /** The expedition under way, if any. */
  expedition: () => FindExpedition | null;
  /** Resolves once the journeys a find may point at are saved, so its foreign key holds. */
  journeysSaved: () => Promise<void>;
  /** Looks up an article's topic and thumbnail when the screen that kept it didn't know them. */
  describe: (page: PageRef) => Promise<{ topic: CardTopic; thumbnailUrl: string | null }>;
  onError: (scope: string, error: unknown) => void;
  events?: FindEvents;
}

const EMPTY_STATE: FindsState = { finds: [], ids: new Set(), notice: null };

const isComplete = (page: FindPage): page is PageRef & FindDetails =>
  page.tileId !== undefined && page.territory !== undefined && page.thumbnailUrl !== undefined;

const withFinds = (state: FindsState, finds: readonly Find[]): FindsState => ({ ...state, finds, ids: new Set(finds.map((find) => find.pageId)) });

const newestFirst = (finds: readonly Find[]) => [...finds].sort((a, b) => b.foundAt - a.foundAt);

export function createFindsStore({ repo, now, expedition, journeysSaved, describe, onError, events = NO_EVENTS }: FindsStoreDeps): FindsStore {
  let state = EMPTY_STATE;
  let noticeIds = 0;
  let saving: Promise<void> = Promise.resolve();
  // Lookups run beside the write queue (like the journey session's topic lookups), so a slow network never holds
  // up a remove; only their result is queued.
  let lookups: ReadonlySet<Promise<void>> = new Set();
  // Pages whose details are still being looked up, so an undo can look them up again.
  let unresolved: ReadonlyMap<number, FindPage> = new Map();
  const listeners = new Set<() => void>();

  const setState = (next: FindsState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const persist = (scope: string, write: () => Promise<unknown>) => {
    saving = saving.then(write).then(
      () => undefined,
      (error: unknown) => onError(scope, error),
    );
  };

  const save = (find: Find) =>
    persist('finds.add', async () => {
      await journeysSaved();
      await repo.add(find);
    });

  const notice = (kind: FindNotice['kind'], find: Find): FindNotice => ({ id: (noticeIds += 1), kind, find });

  /** Fills in details once looked up, unless the find has since been removed (or replaced by a fresh one). */
  async function lookUp(find: Find, page: FindPage): Promise<Find> {
    const { topic, thumbnailUrl } = await describe(page);
    const details: FindDetails = {
      tileId: page.tileId !== undefined ? page.tileId : topic.tileId,
      territory: page.territory !== undefined ? page.territory : topic.territory,
      thumbnailUrl: page.thumbnailUrl !== undefined ? page.thumbnailUrl : thumbnailUrl,
    };
    const current = state.finds.find((f) => f.pageId === find.pageId);
    if (current?.foundAt !== find.foundAt) return { ...find, ...details };
    const completed = { ...current, ...details };
    unresolved = new Map([...unresolved].filter(([pageId]) => pageId !== find.pageId));
    setState(withFinds(state, state.finds.map((f) => (f === current ? completed : f))));
    persist('finds.complete', () => repo.complete(find.pageId, details));
    return completed;
  }

  /** Looks up missing details; `then` gets the find as completed, or as it was when the lookup fails. */
  function completeLater(find: Find, page: FindPage, then: (find: Find) => void = () => undefined) {
    unresolved = new Map([...unresolved, [find.pageId, page]]);
    const lookup = lookUp(find, page).then(then, (error: unknown) => {
      onError('finds.describe', error);
      then(find);
    });
    lookups = new Set([...lookups, lookup]);
    void lookup.finally(() => {
      lookups = new Set([...lookups].filter((l) => l !== lookup));
    });
  }

  function keep(page: FindPage, from: FindFrom) {
    const find: Find = {
      pageId: page.pageId,
      title: page.title,
      tileId: page.tileId ?? null,
      territory: page.territory ?? null,
      thumbnailUrl: page.thumbnailUrl ?? null,
      foundAt: now(),
      expedition: expedition(),
    };
    setState({ ...withFinds(state, [find, ...state.finds]), notice: notice('kept', find) });
    save(find);
    // The event carries the topic, so a find made without one waits for the lookup.
    if (isComplete(page)) events.kept(find, from);
    else completeLater(find, page, (completed) => events.kept(completed, from));
  }

  function remove(find: Find, from: FindFrom) {
    setState({ ...withFinds(state, state.finds.filter((f) => f !== find)), notice: notice('removed', find) });
    persist('finds.remove', () => repo.remove(find.pageId));
    events.removed(find, from);
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async load() {
      const saved = await repo.all();
      // Finds may already have been made or removed while loading; the in-memory list wins for those articles.
      const unseen = saved.filter((find) => !state.ids.has(find.pageId));
      setState(withFinds(state, newestFirst([...state.finds, ...unseen])));
    },

    toggle(page, from) {
      const kept = state.finds.find((find) => find.pageId === page.pageId);
      if (kept) remove(kept, from);
      else keep(page, from);
    },

    undo() {
      if (state.notice?.kind !== 'removed') return;
      const { find } = state.notice;
      if (state.ids.has(find.pageId)) return;
      setState({ ...withFinds(state, newestFirst([find, ...state.finds])), notice: null });
      save(find);
      // A lookup that finished while the find was removed was dropped; look again.
      const page = unresolved.get(find.pageId);
      if (page) completeLater(find, page);
      events.restored(find);
    },

    dismiss(noticeId) {
      if (state.notice?.id === noticeId) setState({ ...state, notice: null });
    },

    async whenSaved() {
      await Promise.all(lookups);
      await saving;
    },
  };
}
