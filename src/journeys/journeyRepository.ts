import { TOPIC_TILES, type Territory } from '../config/topicTiles';
import type { SqlDatabase } from './journeyDatabase';
import type { Expedition, Journey, JourneyNode, NodeVia, Stamp } from './journeyTypes';

export interface JourneyRepository {
  createJourney(journey: Journey): Promise<void>;
  /** Adds a node and makes it the journey's latest. */
  addNode(node: JourneyNode): Promise<void>;
  /** Records a read in the history and, during an expedition, against that expedition. */
  recordRead(read: { pageId: number; at: number; journeyId: string | null }): Promise<void>;
  /** Saves a stamp unless that topic is already stamped; returns whether it was new. */
  awardStamp(stamp: Stamp): Promise<boolean>;
  /** Whether any hop has ever been saved. */
  hasNodes(): Promise<boolean>;
  readPageIds(): Promise<number[]>;
  stamps(): Promise<Stamp[]>;
  /** Every expedition, most recently active first. */
  expeditions(): Promise<Expedition[]>;
  expedition(journeyId: string): Promise<Expedition | null>;
}

interface JourneyRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  last_node_id: string | null;
}

interface NodeRow {
  id: string;
  journey_id: string;
  parent_node_id: string | null;
  page_id: number;
  title: string;
  via: NodeVia;
  tile_id: string | null;
  territory: string | null;
  thumbnail_url: string | null;
  created_at: number;
}

const KNOWN_TILE_IDS: ReadonlySet<string> = new Set(TOPIC_TILES.map((tile) => tile.id));
const KNOWN_TERRITORIES: ReadonlySet<string> = new Set(TOPIC_TILES.map((tile) => tile.territory));

const toJourney = (row: JourneyRow): Journey => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastNodeId: row.last_node_id,
});

// Topics stored by an older build may no longer exist; they fall back to "untagged" rather than breaking the route.
const toNode = (row: NodeRow): JourneyNode => ({
  id: row.id,
  journeyId: row.journey_id,
  parentNodeId: row.parent_node_id,
  pageId: row.page_id,
  title: row.title,
  via: row.via,
  tileId: row.tile_id !== null && KNOWN_TILE_IDS.has(row.tile_id) ? row.tile_id : null,
  territory: row.territory !== null && KNOWN_TERRITORIES.has(row.territory) ? (row.territory as Territory) : null,
  thumbnailUrl: row.thumbnail_url,
  createdAt: row.created_at,
});

function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item]);
  return groups;
}

const NODE_ORDER = 'ORDER BY created_at, rowid';

/**
 * Journey persistence (SPEC.md §9). The database is opened on first use (so merely building the app's services
 * touches no storage); `open` resolves once it is migrated and every call waits for it.
 */
export function createJourneyRepository(openDatabase: () => Promise<SqlDatabase>): JourneyRepository {
  let opening: Promise<SqlDatabase> | null = null;
  // A failed open is forgotten so the next call can try again.
  const open = () =>
    (opening ??= openDatabase().catch((error: unknown) => {
      opening = null;
      throw error;
    }));

  async function loadExpeditions(journeyRows: JourneyRow[], where: string, params: string[]): Promise<Expedition[]> {
    const db = await open();
    const nodes = await db.getAllAsync<NodeRow>(`SELECT * FROM journey_nodes ${where} ${NODE_ORDER}`, params);
    const reads = await db.getAllAsync<{ journey_id: string; page_id: number }>(`SELECT * FROM journey_reads ${where}`, params);
    const nodesByJourney = groupBy(nodes.map(toNode), (node) => node.journeyId);
    const readsByJourney = groupBy(reads, (read) => read.journey_id);
    return journeyRows.map((row) => ({
      journey: toJourney(row),
      nodes: nodesByJourney.get(row.id) ?? [],
      readIds: new Set((readsByJourney.get(row.id) ?? []).map((read) => read.page_id)),
    }));
  }

  return {
    async createJourney(journey) {
      const db = await open();
      await db.runAsync('INSERT INTO journeys (id, title, created_at, updated_at, last_node_id) VALUES (?, ?, ?, ?, ?)', [
        journey.id, journey.title, journey.createdAt, journey.updatedAt, journey.lastNodeId,
      ]);
    },

    async addNode(node) {
      const db = await open();
      await db.runAsync(
        `INSERT INTO journey_nodes (id, journey_id, parent_node_id, page_id, title, via, tile_id, territory, thumbnail_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [node.id, node.journeyId, node.parentNodeId, node.pageId, node.title, node.via, node.tileId, node.territory, node.thumbnailUrl, node.createdAt],
      );
      await db.runAsync('UPDATE journeys SET last_node_id = ?, updated_at = ? WHERE id = ?', [node.id, node.createdAt, node.journeyId]);
    },

    async recordRead({ pageId, at, journeyId }) {
      const db = await open();
      await db.runAsync(
        `INSERT INTO read_history (page_id, first_read_at, last_read_at) VALUES (?, ?, ?)
         ON CONFLICT(page_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
        [pageId, at, at],
      );
      if (journeyId) await db.runAsync('INSERT OR IGNORE INTO journey_reads (journey_id, page_id) VALUES (?, ?)', [journeyId, pageId]);
    },

    async awardStamp({ tileId, pageId, earnedAt }) {
      const db = await open();
      const { changes } = await db.runAsync('INSERT OR IGNORE INTO stamps (topic, page_id, earned_at) VALUES (?, ?, ?)', [tileId, pageId, earnedAt]);
      return changes > 0;
    },

    async hasNodes() {
      const db = await open();
      const rows = await db.getAllAsync<{ found: number }>('SELECT 1 AS found FROM journey_nodes LIMIT 1', []);
      return rows.length > 0;
    },

    async readPageIds() {
      const db = await open();
      const rows = await db.getAllAsync<{ page_id: number }>('SELECT page_id FROM read_history', []);
      return rows.map((row) => row.page_id);
    },

    async stamps() {
      const db = await open();
      const rows = await db.getAllAsync<{ topic: string; page_id: number; earned_at: number }>('SELECT * FROM stamps ORDER BY earned_at', []);
      return rows.filter((row) => KNOWN_TILE_IDS.has(row.topic)).map((row) => ({ tileId: row.topic, pageId: row.page_id, earnedAt: row.earned_at }));
    },

    async expeditions() {
      const db = await open();
      const journeys = await db.getAllAsync<JourneyRow>('SELECT * FROM journeys ORDER BY updated_at DESC, rowid DESC', []);
      return loadExpeditions(journeys, '', []);
    },

    async expedition(journeyId) {
      const db = await open();
      const journeys = await db.getAllAsync<JourneyRow>('SELECT * FROM journeys WHERE id = ?', [journeyId]);
      if (journeys.length === 0) return null;
      const [expedition] = await loadExpeditions(journeys, 'WHERE journey_id = ?', [journeyId]);
      return expedition;
    },
  };
}
