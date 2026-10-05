import { makeFind } from '../finds/__testing__/findFactories';
import { memoryAnalytics } from './__testing__/memoryAnalytics';
import { findEvents } from './findEvents';

describe('findEvents', () => {
  it('sends a kept find’s topic and whether it was made on an expedition, never its title', () => {
    const analytics = memoryAnalytics();

    findEvents(analytics).kept(makeFind('Octopus', { expedition: { id: 'j1', title: 'From Squid' } }), 'reader');

    expect(analytics.named('find_kept')).toEqual([{ from: 'reader', topic: 'animals', territory: 'life', on_expedition: true }]);
  });

  it('sends where a find was removed from, and an undo', () => {
    const analytics = memoryAnalytics();
    const events = findEvents(analytics);

    events.removed(makeFind('Octopus'), 'list');
    events.restored(makeFind('Octopus'));

    expect(analytics.events()).toEqual([
      { name: 'find_removed', properties: { from: 'list' } },
      { name: 'find_restored', properties: {} },
    ]);
  });
});
