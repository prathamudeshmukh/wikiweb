import type { Card } from './card';
import type { Feed, FeedPage } from './pagedFeed';

export interface RestoringFeedSettings {
  /** Cards saved by an earlier app session; may be empty. */
  restore: () => Promise<readonly Card[]>;
  /** Takes over once the restored cards are shown, or straight away when there are none. */
  fresh: Feed;
  /** Told which cards were restored, so the fresh feed can leave them out. */
  onRestored: (cards: readonly Card[]) => void;
  onError: (error: unknown) => void;
}

/** A feed whose first page is restored from disk, with no network, and whose later pages come from `fresh`. */
export function createRestoringFeed({ restore, fresh, onRestored, onError }: RestoringFeedSettings): Feed {
  // Kept, so a page asked for while restoring waits for the restored one instead of overtaking it.
  let restoring: Promise<FeedPage | null> | null = null;

  async function restoredPage(): Promise<FeedPage | null> {
    try {
      const cards = await restore();
      if (cards.length === 0) return null;
      onRestored(cards);
      return { cards: [...cards], done: false };
    } catch (error) {
      onError(error);
      return null;
    }
  }

  return {
    async nextPage() {
      if (restoring) {
        await restoring;
        return fresh.nextPage();
      }
      restoring = restoredPage();
      return (await restoring) ?? fresh.nextPage();
    },
  };
}
