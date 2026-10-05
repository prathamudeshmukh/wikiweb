import { idOf } from '../../content/__testing__/fakeWikiApi';
import { T0 } from '../../journeys/__testing__/journeyFactories';
import type { Find } from '../findTypes';

/** A Home find whose page id is derived from its title, like fakeWikiApi's articles. */
export function makeFind(title: string, overrides: Partial<Find> = {}): Find {
  return {
    pageId: idOf(title),
    title,
    tileId: 'animals',
    territory: 'life',
    thumbnailUrl: null,
    foundAt: T0,
    expedition: null,
    ...overrides,
  };
}
