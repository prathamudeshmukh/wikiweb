import { appFrame } from './appFrame';

describe('appFrame', () => {
  it('fills a phone-width window', () => {
    expect(appFrame({ width: 412, height: 860 }, 480)).toEqual({ width: 412, height: 860, left: 0 });
  });

  it('centres a phone-width column in a wider window', () => {
    expect(appFrame({ width: 1440, height: 900 }, 480)).toEqual({ width: 480, height: 900, left: 480 });
  });

  it('keeps whole pixels when the margin is odd', () => {
    expect(appFrame({ width: 1001, height: 700 }, 480).left).toBe(260);
  });

  it('fills any window when there is no limit', () => {
    expect(appFrame({ width: 1366, height: 1024 }, Infinity)).toEqual({ width: 1366, height: 1024, left: 0 });
  });
});
