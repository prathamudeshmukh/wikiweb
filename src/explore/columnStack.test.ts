import type { PageRef } from '../wiki-api/types';
import { goBack, initialStack, jumpTo, landHop, prepareHop, resumeStack, topOf } from './columnStack';

const octopus: PageRef = { pageId: 1, title: 'Octopus' };
const ink: PageRef = { pageId: 2, title: 'Ink' };
const squid: PageRef = { pageId: 3, title: 'Squid' };
const life = { tileId: 'animals', territory: 'life' } as const;

const hop = (state: ReturnType<typeof initialStack>, card: PageRef) => landHop(prepareHop(state, { ref: card, topic: life }));

describe('column stack', () => {
  it('starts at Home with nothing prepared', () => {
    const state = initialStack();

    expect(state.columns).toHaveLength(1);
    expect(state.columns[0].seed).toBeNull();
    expect(state.prepared).toBeNull();
  });

  it('prepares the dragged card’s column without entering it', () => {
    const state = prepareHop(initialStack(), { ref: octopus, topic: life });

    expect(state.columns).toHaveLength(1);
    expect(state.prepared).toMatchObject({ seed: octopus, seedTopic: life, path: [octopus] });
  });

  it('remembers the dragged card’s thumbnail for the seed header', () => {
    const state = prepareHop(initialStack(), { ref: octopus, topic: life, thumbnailUrl: 'https://img/octopus.jpg' });

    expect(state.prepared?.seedThumbnailUrl).toBe('https://img/octopus.jpg');
  });

  it('keeps the same prepared column when the same card is dragged again', () => {
    const once = prepareHop(initialStack(), { ref: octopus, topic: life });

    expect(prepareHop(once, { ref: octopus, topic: life })).toBe(once);
  });

  it('enters the prepared column on landing, extending the path', () => {
    const state = hop(hop(initialStack(), octopus), ink);

    expect(state.columns.map((c) => c.seed?.title ?? 'Home')).toEqual(['Home', 'Octopus', 'Ink']);
    expect(state.columns[2].path).toEqual([octopus, ink]);
    expect(state.prepared).toBeNull();
  });

  it('ignores a landing with nothing prepared', () => {
    const state = initialStack();

    expect(landHop(state)).toBe(state);
  });

  it('goes back one column and reports which card to pulse', () => {
    const { state, cameFrom } = goBack(hop(hop(initialStack(), octopus), ink));

    expect(state.columns.map((c) => c.seed?.title ?? 'Home')).toEqual(['Home', 'Octopus']);
    expect(cameFrom).toEqual(ink);
  });

  it('cannot go back from Home', () => {
    const home = initialStack();

    expect(goBack(home)).toEqual({ state: home, cameFrom: null });
  });

  it('jumps straight to an earlier column and drops anything prepared', () => {
    const deep = prepareHop(hop(hop(hop(initialStack(), octopus), ink), squid), { ref: octopus, topic: life });

    const state = jumpTo(deep, 1);

    expect(state.columns.map((c) => c.seed?.title ?? 'Home')).toEqual(['Home', 'Octopus']);
    expect(state.prepared).toBeNull();
  });

  it('gives every column a unique, stable id', () => {
    const state = hop(hop(initialStack(), octopus), ink);

    expect(new Set(state.columns.map((c) => c.id)).size).toBe(3);
    expect(hop(hop(initialStack(), octopus), ink).columns[2].id).toBe(state.columns[2].id);
  });

  it('files the landed column under its Journey node', () => {
    const state = landHop(prepareHop(initialStack(), { ref: octopus, topic: life }), 'node-1');

    expect(topOf(state).nodeId).toBe('node-1');
  });

  it('reopens a resumed expedition’s columns above Home', () => {
    const state = resumeStack([
      { ref: octopus, topic: life, nodeId: 'n1' },
      { ref: squid, topic: life, thumbnailUrl: 'https://img/squid.jpg', nodeId: 'n2' },
    ]);

    expect(state.columns.map((c) => c.nodeId)).toEqual([null, 'n1', 'n2']);
    expect(topOf(state)).toMatchObject({ path: [octopus, squid], seedThumbnailUrl: 'https://img/squid.jpg' });
  });

  it('gives a resumed column the same id as when it was first opened', () => {
    const swiped = hop(hop(initialStack(), octopus), squid);

    const resumed = resumeStack([{ ref: octopus, topic: life, nodeId: 'n1' }, { ref: squid, topic: life, nodeId: 'n2' }]);

    expect(topOf(resumed).id).toBe(topOf(swiped).id);
  });
});
