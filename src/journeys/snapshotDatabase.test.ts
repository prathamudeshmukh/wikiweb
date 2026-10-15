import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { reportError } from '../services/reportError';
import { openSnapshotDatabase, SNAPSHOT_SAVE_DELAY_MS, type SnapshotStore } from './snapshotDatabase';

jest.mock('../services/reportError', () => ({ reportError: jest.fn() }));

const CREATE_TABLE = 'CREATE TABLE finds (page_id INTEGER PRIMARY KEY)';
const INSERT_FIND = 'INSERT INTO finds VALUES (?)';

let sql: SqlJsStatic;

beforeAll(async () => {
  sql = await initSqlJs();
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(reportError).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

function memorySnapshots(): SnapshotStore & { saved: Uint8Array | null; write: jest.Mock } {
  const store = {
    saved: null as Uint8Array | null,
    read: async () => store.saved,
    write: jest.fn(async (bytes: Uint8Array) => {
      store.saved = bytes;
    }),
  };
  return store;
}

async function openWithTable(store: SnapshotStore) {
  const opened = await openSnapshotDatabase({ sql, openStore: async () => store });
  await opened.database.execAsync(CREATE_TABLE);
  return opened;
}

describe('openSnapshotDatabase', () => {
  it('reopens with what was written before the page closed', async () => {
    const store = memorySnapshots();
    const first = await openWithTable(store);
    await first.database.runAsync(INSERT_FIND, [7]);

    first.flush();
    await Promise.resolve();
    const reopened = await openSnapshotDatabase({ sql, openStore: async () => store });

    await expect(reopened.database.getAllAsync('SELECT page_id FROM finds', [])).resolves.toEqual([{ page_id: 7 }]);
  });

  it('saves a burst of writes once, after the writes settle', async () => {
    const store = memorySnapshots();
    const { database } = await openWithTable(store);
    await database.runAsync(INSERT_FIND, [1]);
    await database.runAsync(INSERT_FIND, [2]);

    jest.advanceTimersByTime(SNAPSHOT_SAVE_DELAY_MS - 1);
    expect(store.write).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);

    expect(store.write).toHaveBeenCalledTimes(1);
  });

  it('does not save after reads', async () => {
    const store = memorySnapshots();
    const { database, flush } = await openWithTable(store);
    flush();
    store.write.mockClear();

    await database.getAllAsync('SELECT * FROM finds', []);
    jest.advanceTimersByTime(SNAPSHOT_SAVE_DELAY_MS);

    expect(store.write).not.toHaveBeenCalled();
  });

  it('has nothing to flush when no write is waiting', async () => {
    const store = memorySnapshots();
    const { flush } = await openSnapshotDatabase({ sql, openStore: async () => store });

    flush();

    expect(store.write).not.toHaveBeenCalled();
  });

  it('keeps working for the session when storage cannot be opened', async () => {
    const blocked = new Error('blocked');

    const { database } = await openSnapshotDatabase({ sql, openStore: () => Promise.reject(blocked) });
    await database.execAsync(CREATE_TABLE);
    await database.runAsync(INSERT_FIND, [7]);

    await expect(database.getAllAsync('SELECT page_id FROM finds', [])).resolves.toEqual([{ page_id: 7 }]);
    expect(reportError).toHaveBeenCalledWith('storage.journeys', blocked);
  });

  it('never overwrites a snapshot it could not read', async () => {
    const store = { ...memorySnapshots(), read: () => Promise.reject(new Error('corrupt')) };
    const { database } = await openWithTable(store);

    await database.runAsync(INSERT_FIND, [7]);
    jest.advanceTimersByTime(SNAPSHOT_SAVE_DELAY_MS);

    expect(store.write).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith('storage.journeys', expect.any(Error));
  });

  it('reports a save that fails', async () => {
    const full = new Error('quota');
    const store = { ...memorySnapshots(), write: jest.fn(() => Promise.reject(full)) };
    const { database } = await openWithTable(store);

    await database.runAsync(INSERT_FIND, [7]);
    jest.advanceTimersByTime(SNAPSHOT_SAVE_DELAY_MS);
    await Promise.resolve();

    expect(reportError).toHaveBeenCalledWith('storage.journeys', full);
  });
});
