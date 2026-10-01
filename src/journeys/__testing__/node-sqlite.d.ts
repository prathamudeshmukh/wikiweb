// The slice of Node's built-in SQLite driver the in-memory test database uses (the app has no @types/node).
declare module 'node:sqlite' {
  type Value = string | number | bigint | null | Uint8Array;
  interface StatementSync {
    run(...params: Value[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    all(...params: Value[]): unknown[];
  }
  export class DatabaseSync {
    constructor(location: string);
    exec(source: string): void;
    prepare(source: string): StatementSync;
  }
}
