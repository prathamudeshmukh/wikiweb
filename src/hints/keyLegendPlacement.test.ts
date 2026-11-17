import { keyLegendLeft } from './keyLegendPlacement';

const column = { width: 480, height: 900 };

describe('keyLegendLeft', () => {
  it('sits a gap to the right of a centred column', () => {
    expect(keyLegendLeft(1440, { ...column, left: 480 })).toBe(480 + 480 + 32);
  });

  it('is hidden when the side margin cannot hold it', () => {
    expect(keyLegendLeft(800, { ...column, left: 160 })).toBeNull();
  });

  it('is hidden when the app fills the window', () => {
    expect(keyLegendLeft(412, { width: 412, height: 860, left: 0 })).toBeNull();
  });
});
