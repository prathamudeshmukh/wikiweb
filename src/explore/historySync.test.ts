import { createHistorySync, type HistoryPort, keepDepthThroughReplaces } from './historySync';

/** A browser history: entries, the current one, and `go` that moves now and leaves the popstate to the test. */
function fakeHistory(initialState: unknown = { id: 'router-home' }) {
  const entries: unknown[] = [initialState];
  let index = 0;
  const history: HistoryPort & { entries: unknown[]; readonly index: number } = {
    entries,
    get index() {
      return index;
    },
    get state() {
      return entries[index];
    },
    pushState: jest.fn((state: unknown) => {
      entries.splice(index + 1, entries.length, state);
      index += 1;
    }),
    go: jest.fn((delta: number) => {
      index += delta;
    }),
  };
  return history;
}

function setup(initialState?: unknown) {
  const history = fakeHistory(initialState);
  const actions = { back: jest.fn(), jumpTo: jest.fn() };
  const sync = createHistorySync(history, actions);
  /** The browser moved (Back/Forward or our own `go`) and fired popstate. */
  const browserMoves = (delta: number) => {
    history.go(delta);
    sync.popped(history.state);
  };
  return { history, actions, sync, browserMoves };
}

describe('createHistorySync', () => {
  it('adds a history entry for each landed hop, keeping the router’s own state', () => {
    const { history, sync } = setup();

    sync.depthChanged(1);
    sync.depthChanged(2);

    expect(history.entries).toEqual([{ id: 'router-home' }, { id: 'router-home', tangentDepth: 1 }, { id: 'router-home', tangentDepth: 2 }]);
  });

  it('adds an entry per column when an expedition reopens several columns deep', () => {
    const { history, sync } = setup();

    sync.depthChanged(3);

    expect(history.entries).toHaveLength(4);
  });

  it('runs the app’s back when the browser goes back one entry', () => {
    const { actions, sync, browserMoves } = setup();
    sync.depthChanged(1);
    sync.depthChanged(2);

    browserMoves(-1);

    expect(actions.back).toHaveBeenCalledTimes(1);
  });

  it('jumps to the matching column when the browser goes back several entries at once', () => {
    const { actions, sync, browserMoves } = setup();
    sync.depthChanged(3);

    browserMoves(-3);

    expect(actions.jumpTo).toHaveBeenCalledWith(0);
    expect(actions.back).not.toHaveBeenCalled();
  });

  it('follows an in-app back by going back one entry, without taking that for a browser Back', () => {
    const { history, actions, sync } = setup();
    sync.depthChanged(2);

    sync.depthChanged(1);
    sync.popped(history.state);

    expect(history.go).toHaveBeenCalledWith(-1);
    expect(actions.back).not.toHaveBeenCalled();
  });

  it('follows a breadcrumb jump by going back the matching number of entries', () => {
    const { history, sync } = setup();
    sync.depthChanged(3);

    sync.depthChanged(1);

    expect(history.go).toHaveBeenCalledWith(-2);
  });

  it('pushes the next hop after the entry an in-app back returned to', () => {
    const { history, sync } = setup();
    sync.depthChanged(2);
    sync.depthChanged(1);
    sync.popped(history.state);

    sync.depthChanged(2);

    expect(history.entries.map((entry) => (entry as { tangentDepth?: number }).tangentDepth)).toEqual([undefined, 1, 2]);
  });

  it('sends Forward to a column already left back where the app is', () => {
    const { history, actions, sync, browserMoves } = setup();
    sync.depthChanged(2);
    browserMoves(-1);
    sync.depthChanged(1);

    browserMoves(1);

    expect(history.go).toHaveBeenLastCalledWith(-1);
    expect(actions.back).toHaveBeenCalledTimes(1);
  });

  it('starts from the Home entry when the page reloads on a hop entry', () => {
    const { history } = setup({ id: 'router-home', tangentDepth: 2 });

    expect(history.go).toHaveBeenCalledWith(-2);
  });

  it('does nothing for an entry the app never pushed', () => {
    const { history, actions, sync } = setup();

    sync.popped(null);
    sync.popped('not an object');

    expect(actions.back).not.toHaveBeenCalled();
    expect(history.go).not.toHaveBeenCalled();
  });
});

describe('keepDepthThroughReplaces', () => {
  function replaceableHistory(state: unknown) {
    const history = {
      state,
      replaceState(next: unknown, _unused: string) {
        history.state = next;
      },
    };
    return history;
  }

  it('keeps a hop entry’s depth when the router rewrites that same entry', () => {
    const history = replaceableHistory({ id: 'router-home', tangentDepth: 2 });
    keepDepthThroughReplaces(history);

    history.replaceState({ id: 'router-home' }, '');

    expect(history.state).toEqual({ id: 'router-home', tangentDepth: 2 });
  });

  it('lets the router replace the entry with another of its own', () => {
    const history = replaceableHistory({ id: 'router-home', tangentDepth: 2 });
    keepDepthThroughReplaces(history);

    history.replaceState({ id: 'router-reader' }, '');

    expect(history.state).toEqual({ id: 'router-reader' });
  });

  it('can be undone', () => {
    const history = replaceableHistory({ id: 'router-home', tangentDepth: 2 });
    const undo = keepDepthThroughReplaces(history);

    undo();
    history.replaceState({ id: 'router-home' }, '');

    expect(history.state).toEqual({ id: 'router-home' });
  });
});
