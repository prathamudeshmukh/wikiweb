import { makeJourney, makeNode } from './__testing__/journeyFactories';
import { columnPathTo, depthOf, furthestLeap, recapOf, resumeNodeId } from './expedition';
import type { Expedition, JourneyNode } from './journeyTypes';

// Octopus → Squid → Iron gall ink (read in place) → Magna Carta (tangent from the reader)
//         ↘ Camouflage (another branch, taken after coming back)
const OCTOPUS = makeNode('n1', 'Octopus', { territory: 'life' });
const SQUID = makeNode('n2', 'Squid', { parentNodeId: 'n1', territory: 'life' });
const INK = makeNode('n3', 'Iron gall ink', { parentNodeId: 'n2', via: 'peek_read', territory: 'cosmos' });
const MAGNA = makeNode('n4', 'Magna Carta', { parentNodeId: 'n3', via: 'peek_explore', territory: 'past' });
const CAMO = makeNode('n5', 'Camouflage', { parentNodeId: 'n1', territory: 'earth' });
const NODES: JourneyNode[] = [OCTOPUS, SQUID, INK, MAGNA, CAMO];

const expedition = (nodes: JourneyNode[], lastNodeId: string | null, readIds: number[] = []): Expedition => ({
  journey: makeJourney('j1', { lastNodeId }),
  nodes,
  readIds: new Set(readIds),
});

describe('columnPathTo', () => {
  it('reopens every column from the start of the expedition down to the node', () => {
    expect(columnPathTo(NODES, 'n2').map((n) => n.title)).toEqual(['Octopus', 'Squid']);
  });

  it('skips articles read in place, since they never opened a column', () => {
    expect(columnPathTo(NODES, 'n4').map((n) => n.title)).toEqual(['Octopus', 'Squid', 'Magna Carta']);
  });

  it('stands in the column an article was read from', () => {
    expect(columnPathTo(NODES, 'n3').map((n) => n.title)).toEqual(['Octopus', 'Squid']);
  });

  it('returns nothing for an unknown node', () => {
    expect(columnPathTo(NODES, 'missing')).toEqual([]);
  });

  it('survives a corrupt parent loop', () => {
    const looped = [makeNode('a', 'A', { parentNodeId: 'b' }), makeNode('b', 'B', { parentNodeId: 'a' })];

    expect(columnPathTo(looped, 'a').map((n) => n.id)).toEqual(['b', 'a']);
  });
});

describe('resumeNodeId', () => {
  it('resumes at the most recent node', () => {
    expect(resumeNodeId(expedition(NODES, 'n4'))).toBe('n4');
  });

  it('falls back to the last node added when the saved pointer is missing', () => {
    expect(resumeNodeId(expedition(NODES, 'gone'))).toBe('n5');
  });

  it('has nowhere to resume in an empty expedition', () => {
    expect(resumeNodeId(expedition([], null))).toBeNull();
  });
});

describe('depthOf', () => {
  it('counts hops from the start of the expedition', () => {
    const depths = depthOf(NODES);

    expect([depths.get('n1'), depths.get('n4'), depths.get('n5')]).toEqual([1, 4, 2]);
  });
});

describe('furthestLeap', () => {
  it('picks the deepest hop into another territory', () => {
    expect(furthestLeap(NODES)).toEqual({ from: 'Iron gall ink', to: 'Magna Carta' });
  });

  it('prefers the latest leap when two are equally deep', () => {
    const nodes = [OCTOPUS, makeNode('a', 'Art', { parentNodeId: 'n1', territory: 'culture' }), makeNode('b', 'Bach', { parentNodeId: 'n1', territory: 'mind' })];

    expect(furthestLeap(nodes)).toEqual({ from: 'Octopus', to: 'Bach' });
  });

  it('ignores hops that stay in one territory or lack one', () => {
    const nodes = [OCTOPUS, SQUID, makeNode('x', 'Untagged', { parentNodeId: 'n2', territory: null })];

    expect(furthestLeap(nodes)).toBeNull();
  });
});

describe('recapOf', () => {
  it('summarises where the expedition went', () => {
    const recap = recapOf(expedition(NODES, 'n5', [1, 2, 3]));

    expect(recap).toMatchObject({ startTitle: 'Octopus', endTitle: 'Camouflage', tangents: 4, reads: 3 });
    expect(recap.route).toEqual(['life', 'life', 'past', 'earth']);
  });

  it('copes with an expedition that has no nodes yet', () => {
    expect(recapOf(expedition([], null))).toMatchObject({ startTitle: '', endTitle: '', tangents: 0, furthestLeap: null });
  });
});
