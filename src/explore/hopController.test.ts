import { isAtScreenEdge } from './hopController';

const PHONE = { width: 400, left: 0 };
const GUARD = 20;

describe('isAtScreenEdge', () => {
  it('claims touches starting within the guard of either edge', () => {
    expect(isAtScreenEdge(19, PHONE, GUARD)).toBe(true);
    expect(isAtScreenEdge(PHONE.width - 19, PHONE, GUARD)).toBe(true);
  });

  it('leaves touches further in to the app', () => {
    expect(isAtScreenEdge(GUARD, PHONE, GUARD)).toBe(false);
    expect(isAtScreenEdge(PHONE.width - GUARD, PHONE, GUARD)).toBe(false);
  });

  it('measures from the app’s column when it is centred in a wide window', () => {
    const centred = { width: 480, left: 480 };

    expect(isAtScreenEdge(480 + 100, centred, GUARD)).toBe(false);
    expect(isAtScreenEdge(480 + 470, centred, GUARD)).toBe(true);
  });

  it('claims nothing without a guard (native, where the OS owns its edges)', () => {
    expect(isAtScreenEdge(0, PHONE, 0)).toBe(false);
  });
});
