import { isAtScreenEdge } from './hopController';

const SCREEN_WIDTH = 400;
const GUARD = 20;

describe('isAtScreenEdge', () => {
  it('claims touches starting within the guard of either edge', () => {
    expect(isAtScreenEdge(19, SCREEN_WIDTH, GUARD)).toBe(true);
    expect(isAtScreenEdge(SCREEN_WIDTH - 19, SCREEN_WIDTH, GUARD)).toBe(true);
  });

  it('leaves touches further in to the app', () => {
    expect(isAtScreenEdge(GUARD, SCREEN_WIDTH, GUARD)).toBe(false);
    expect(isAtScreenEdge(SCREEN_WIDTH - GUARD, SCREEN_WIDTH, GUARD)).toBe(false);
  });

  it('claims nothing without a guard (native, where the OS owns its edges)', () => {
    expect(isAtScreenEdge(0, SCREEN_WIDTH, 0)).toBe(false);
  });
});
