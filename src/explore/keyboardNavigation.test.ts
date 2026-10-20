import type { ViewToken } from 'react-native';
import { makeArticle } from '../content/__testing__/fakeWikiApi';
import { cardFromArticle } from '../tangent/TangentContext';
import { keyCommand, keyboardTarget } from './keyboardNavigation';

const octopus = cardFromArticle(makeArticle('Octopus'));
const squid = cardFromArticle(makeArticle('Squid'));
const NO_MODIFIERS = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, repeat: false };

const token = (item: typeof octopus, index: number): ViewToken<typeof octopus> => ({ item, index, key: String(index), isViewable: true });

describe('keyCommand', () => {
  it('maps the arrows and Enter to back, hop and read', () => {
    expect(['ArrowLeft', 'ArrowRight', 'Enter'].map((key) => keyCommand({ ...NO_MODIFIERS, key }))).toEqual(['back', 'hop', 'read']);
  });

  it('leaves modified keys to the browser — Alt+← is its own Back', () => {
    expect(keyCommand({ ...NO_MODIFIERS, key: 'ArrowLeft', altKey: true })).toBeNull();
    expect(keyCommand({ ...NO_MODIFIERS, key: 'ArrowRight', metaKey: true })).toBeNull();
  });

  it('ignores a held key and keys it doesn’t use', () => {
    expect(keyCommand({ ...NO_MODIFIERS, key: 'ArrowRight', repeat: true })).toBeNull();
    expect(keyCommand({ ...NO_MODIFIERS, key: 'ArrowDown' })).toBeNull();
  });
});

describe('keyboardTarget', () => {
  it('picks the topmost card dwelt on', () => {
    expect(keyboardTarget([token(squid, 3), token(octopus, 2)], [octopus, squid])).toBe(octopus);
  });

  it('falls back to the column’s first card before any has dwelt', () => {
    expect(keyboardTarget([], [squid, octopus])).toBe(squid);
  });

  it('has nothing to pick in an empty column', () => {
    expect(keyboardTarget([], [])).toBeNull();
  });
});
