import { FontDisplay } from 'expo-font';
import { FONT_SOURCES } from './fonts';
import { LOADED_FONTS, WAITS_FOR_FONTS } from './fontLoading.web';

describe('fontLoading (web)', () => {
  it('draws straight away, without waiting for the faces', () => {
    expect(WAITS_FOR_FONTS).toBe(false);
  });

  it('loads every face the app names, swapped in once it arrives', () => {
    expect(Object.keys(LOADED_FONTS).sort()).toEqual(Object.keys(FONT_SOURCES).sort());
    expect(Object.values(LOADED_FONTS)).toEqual(Object.values(LOADED_FONTS).map(() => expect.objectContaining({ display: FontDisplay.SWAP })));
  });
});
