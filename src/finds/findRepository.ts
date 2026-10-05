import { openOnce, type SqlDatabase } from '../journeys/journeyDatabase';
import { storedTerritory, storedTileId } from '../journeys/storedTopic';
import type { Find, FindDetails } from './findTypes';

export interface FindRepository {
  /** Saves a find unless the article is already kept — the first find wins. */
  add(find: Find): Promise<void>;
  remove(pageId: number): Promise<void>;
  /** Fills in a find's details once they're known. */
  complete(pageId: number, details: FindDetails): Promise<void>;
  /** Every find, newest first. */
  all(): Promise<Find[]>;
}

interface FindRow {
  page_id: number;
  found_at: number;
  journey_id: string | null;
  journey_title: string | null;
  title: string;
  thumbnail_url: string | null;
  tile_id: string | null;
  territory: string | null;
}

const toFind = (row: FindRow): Find => ({
  pageId: row.page_id,
  title: row.title,
  tileId: storedTileId(row.tile_id),
  territory: storedTerritory(row.territory),
  thumbnailUrl: row.thumbnail_url,
  foundAt: row.found_at,
  expedition: row.journey_id !== null && row.journey_title !== null ? { id: row.journey_id, title: row.journey_title } : null,
});

/** Finds persistence (SPEC.md §9), sharing the journey database. */
export function createFindRepository(openDatabase: () => Promise<SqlDatabase>): FindRepository {
  const open = openOnce(openDatabase);
  return {
    async add(find) {
      const db = await open();
      await db.runAsync(
        `INSERT OR IGNORE INTO finds (page_id, found_at, journey_id, title, thumbnail_url, tile_id, territory) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [find.pageId, find.foundAt, find.expedition?.id ?? null, find.title, find.thumbnailUrl, find.tileId, find.territory],
      );
    },

    async remove(pageId) {
      const db = await open();
      await db.runAsync('DELETE FROM finds WHERE page_id = ?', [pageId]);
    },

    async complete(pageId, { tileId, territory, thumbnailUrl }) {
      const db = await open();
      await db.runAsync('UPDATE finds SET tile_id = ?, territory = ?, thumbnail_url = ? WHERE page_id = ?', [tileId, territory, thumbnailUrl, pageId]);
    },

    async all() {
      const db = await open();
      const rows = await db.getAllAsync<FindRow>(
        `SELECT finds.*, journeys.title AS journey_title FROM finds LEFT JOIN journeys ON journeys.id = finds.journey_id
         ORDER BY finds.found_at DESC, finds.rowid DESC`,
        [],
      );
      return rows.map(toFind);
    },
  };
}
