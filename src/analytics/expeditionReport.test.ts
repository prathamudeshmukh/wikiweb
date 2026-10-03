import { makeJourney, makeNode, T0 } from '../journeys/__testing__/journeyFactories';
import type { Expedition } from '../journeys/journeyTypes';
import { idOf } from '../content/__testing__/fakeWikiApi';
import { memoryAnalytics } from './__testing__/memoryAnalytics';
import { createExpeditionReporter } from './expeditionReport';

// Octopus → Squid → Ink (read in place from Squid), and Octopus → Cuttlefish.
const EXPEDITION: Expedition = {
  journey: makeJourney('j1'),
  nodes: [
    makeNode('n1', 'Octopus', { territory: 'life' }),
    makeNode('n2', 'Squid', { parentNodeId: 'n1', territory: 'life' }),
    makeNode('n3', 'Ink', { parentNodeId: 'n2', via: 'peek_read', territory: 'craft' }),
    makeNode('n4', 'Cuttlefish', { parentNodeId: 'n1', via: 'peek_explore', territory: null }),
  ],
  readIds: new Set([idOf('Squid'), idOf('Ink')]),
};

function setup(at = T0 + 95_000) {
  const analytics = memoryAnalytics();
  const reporter = createExpeditionReporter({ analytics, now: () => at });
  return { analytics, reporter };
}

describe('expedition reporter', () => {
  it('summarises an expedition when it ends', () => {
    const { analytics, reporter } = setup();

    reporter.ended(EXPEDITION, 'home');

    expect(analytics.named('expedition_ended')).toEqual([
      { expedition_id: 'j1', ended_by: 'home', node_count: 4, max_depth: 2, reads: 2, duration_s: 95, territories: 2, stamps_earned: 0 },
    ]);
  });

  it('counts the stamps earned during that expedition only', () => {
    const { analytics, reporter } = setup();
    reporter.stampEarned({ tileId: 'animals', territory: 'life' }, 'j1');
    reporter.stampEarned({ tileId: 'space', territory: 'cosmos' }, 'j2');
    reporter.stampEarned({ tileId: 'maths', territory: 'mind' }, null);

    reporter.ended(EXPEDITION, 'background');

    expect(analytics.named('expedition_ended')[0]).toMatchObject({ ended_by: 'background', stamps_earned: 1 });
  });

  it('reports each stamp with its topic and territory', () => {
    const { analytics, reporter } = setup();

    reporter.stampEarned({ tileId: 'animals', territory: 'life' }, null);

    expect(analytics.named('stamp_earned')).toEqual([{ topic: 'animals', territory: 'life' }]);
  });

  it('ignores a stamp without a topic', () => {
    const { analytics, reporter } = setup();

    reporter.stampEarned({ tileId: null, territory: 'life' }, 'j1');

    expect(analytics.events()).toEqual([]);
  });
});
