export type SqlValue = string | number | null;

/** The slice of expo-sqlite's SQLiteDatabase the journey repository uses (an in-memory adapter backs tests). */
export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<{ changes: number }>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
}

// SPEC.md §9. Deviations, kept in the spec too: nodes carry their topic and thumbnail (card_cache lands in M5,
// and a route must draw without the network) and journey_reads records which articles were read on which expedition.
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE journeys (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL,
    last_node_id  TEXT
  );
  CREATE TABLE journey_nodes (
    id              TEXT PRIMARY KEY,
    journey_id      TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    parent_node_id  TEXT REFERENCES journey_nodes(id),
    page_id         INTEGER NOT NULL,
    title           TEXT NOT NULL,
    via             TEXT NOT NULL CHECK (via IN ('swipe','peek_explore','peek_read')),
    tile_id         TEXT,
    territory       TEXT,
    thumbnail_url   TEXT,
    created_at      INTEGER NOT NULL
  );
  CREATE INDEX idx_nodes_journey ON journey_nodes(journey_id);
  CREATE INDEX idx_nodes_page    ON journey_nodes(page_id);
  CREATE TABLE read_history (
    page_id        INTEGER PRIMARY KEY,
    first_read_at  INTEGER NOT NULL,
    last_read_at   INTEGER NOT NULL
  );
  CREATE TABLE journey_reads (
    journey_id  TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    page_id     INTEGER NOT NULL,
    PRIMARY KEY (journey_id, page_id)
  );
  CREATE TABLE stamps (
    topic       TEXT PRIMARY KEY,
    page_id     INTEGER NOT NULL,
    earned_at   INTEGER NOT NULL
  );
  `,
  // M8 (SPEC.md §3.9) — the Logbook's record of interest-tree nodes read in full. Any node, leaf or subfield.
  `
  CREATE TABLE completed_leaves (
    node_path      TEXT PRIMARY KEY,
    completed_at   INTEGER NOT NULL,
    article_count  INTEGER NOT NULL
  );
  `,
  // M6 (SPEC.md §3.7) — articles kept with ✦. The card is snapshotted so the Logbook renders offline.
  `
  CREATE TABLE finds (
    page_id        INTEGER PRIMARY KEY,
    found_at       INTEGER NOT NULL,
    journey_id     TEXT REFERENCES journeys(id) ON DELETE SET NULL,
    title          TEXT NOT NULL,
    thumbnail_url  TEXT,
    tile_id        TEXT,
    territory      TEXT
  );
  CREATE INDEX idx_finds_journey ON finds(journey_id);
  `,
];

/** Brings the schema up to date, one migration per `user_version`. */
export async function migrate(db: SqlDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const [{ user_version: version }] = await db.getAllAsync<{ user_version: number }>('PRAGMA user_version', []);
  for (let next = version; next < MIGRATIONS.length; next += 1) {
    await db.execAsync(`BEGIN; ${MIGRATIONS[next]} PRAGMA user_version = ${next + 1}; COMMIT;`);
  }
}

/**
 * Opens the database on first use and shares it between callers; a failed open is forgotten so the next call can
 * try again.
 */
export function openOnce(openDatabase: () => Promise<SqlDatabase>): () => Promise<SqlDatabase> {
  let opening: Promise<SqlDatabase> | null = null;
  return () =>
    (opening ??= openDatabase().catch((error: unknown) => {
      opening = null;
      throw error;
    }));
}
