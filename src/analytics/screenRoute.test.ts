import { screenRoute } from './screenRoute';

describe('screenRoute', () => {
  it('names Home as the root', () => {
    expect(screenRoute([])).toBe('/');
  });

  it('keeps dynamic segments as their pattern', () => {
    expect(screenRoute(['expedition', '[id]'])).toBe('/expedition/[id]');
  });
});
