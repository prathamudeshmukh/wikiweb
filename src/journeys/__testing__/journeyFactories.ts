import { idOf } from '../../content/__testing__/fakeWikiApi';
import type { Journey, JourneyNode } from '../journeyTypes';

export const T0 = Date.UTC(2026, 9, 1, 9, 0);

export function makeJourney(id: string, overrides: Partial<Journey> = {}): Journey {
  return { id, title: `From ${id}`, createdAt: T0, updatedAt: T0, lastNodeId: null, ...overrides };
}

/** A node whose page id is derived from its title, like fakeWikiApi's articles. */
export function makeNode(id: string, title: string, overrides: Partial<JourneyNode> = {}): JourneyNode {
  return {
    id,
    journeyId: 'j1',
    parentNodeId: null,
    pageId: idOf(title),
    title,
    via: 'swipe',
    tileId: null,
    territory: null,
    thumbnailUrl: null,
    createdAt: T0,
    ...overrides,
  };
}
