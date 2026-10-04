import { openOnce, type SqlDatabase } from '../journeys/journeyDatabase';
import { resolvePick } from './interestPicks';

/** An interest-tree node the user has read in full (SPEC.md §3.9). */
export interface CompletedNode {
  nodePath: string;
  completedAt: number;
  /** The node's pool size when it was completed. */
  articleCount: number;
}

export interface CompletedNodes {
  /** True the first time a node is recorded; a node found exhausted again keeps its first record. */
  record(node: CompletedNode): Promise<boolean>;
  /** Newest first, leaving out nodes no longer in the tree. */
  list(): Promise<CompletedNode[]>;
}

interface Row {
  node_path: string;
  completed_at: number;
  article_count: number;
}

const isCurrentNode = (path: string) => resolvePick(path)?.fellBack === false;

/** The Logbook's *Completed* record. Whether a node is exhausted *now* is derived from read history instead. */
export function createCompletedNodes(openDatabase: () => Promise<SqlDatabase>): CompletedNodes {
  const open = openOnce(openDatabase);
  return {
    async record({ nodePath, completedAt, articleCount }) {
      const db = await open();
      const { changes } = await db.runAsync('INSERT OR IGNORE INTO completed_leaves (node_path, completed_at, article_count) VALUES (?, ?, ?)', [
        nodePath,
        completedAt,
        articleCount,
      ]);
      return changes > 0;
    },
    async list() {
      const db = await open();
      const rows = await db.getAllAsync<Row>('SELECT * FROM completed_leaves ORDER BY completed_at DESC', []);
      return rows
        .filter((row) => isCurrentNode(row.node_path))
        .map((row) => ({ nodePath: row.node_path, completedAt: row.completed_at, articleCount: row.article_count }));
    },
  };
}
