import { isTrackedScreen, screenRoute } from './screenRoute';

describe('screenRoute', () => {
  it('names Home as the root', () => {
    expect(screenRoute([])).toBe('/');
  });

  it('keeps dynamic segments as their pattern', () => {
    expect(screenRoute(['expedition', '[id]'])).toBe('/expedition/[id]');
  });
});

describe('isTrackedScreen', () => {
  it('tracks the app\'s screens', () => {
    expect(isTrackedScreen('/settings')).toBe(true);
  });

  it('leaves the About & privacy page untracked', () => {
    expect(isTrackedScreen('/about')).toBe(false);
  });
});
