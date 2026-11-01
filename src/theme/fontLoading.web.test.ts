import { FontDisplay } from 'expo-font';
import { FONT_SOURCES } from './fonts';
import { LOADED_FONTS, WAITS_FOR_FONTS } from './fontLoading.web';

describe('fontLoading (web)', () => {
  it('draws straight away and swaps every face in once it loads', () => {
    expect(WAITS_FOR_FONTS).toBe(false);
    expect(LOADED_FONTS).toEqual(
      Object.fromEntries(Object.entries(FONT_SOURCES).map(([name, module]) => [name, { uri: module, display: FontDisplay.SWAP }])),
    );
  });
});
