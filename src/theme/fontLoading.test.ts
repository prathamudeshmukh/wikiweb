import { FONT_SOURCES } from './fonts';
import { LOADED_FONTS, WAITS_FOR_FONTS } from './fontLoading';

describe('fontLoading (native)', () => {
  it('waits for the faces before the first frame', () => {
    expect(WAITS_FOR_FONTS).toBe(true);
    expect(LOADED_FONTS).toBe(FONT_SOURCES);
  });
});
