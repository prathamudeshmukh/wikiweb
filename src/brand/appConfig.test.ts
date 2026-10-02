import appJson from '../../app.json';
import { NIGHT_ATLAS, PAPER } from '../theme/tokens';

// app.json can't import the palette, so this pins its brand colours to the tokens.
describe('app.json brand colours', () => {
  const { android, plugins } = appJson.expo;
  const splash = plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') as [string, { backgroundColor: string; dark: { backgroundColor: string } }];

  it('puts the adaptive icon on paper', () => {
    expect(android.adaptiveIcon.backgroundColor).toBe(PAPER.paper);
  });

  it('opens on paper in light mode and walnut in dark mode', () => {
    expect(splash[1].backgroundColor).toBe(PAPER.paper);
    expect(splash[1].dark.backgroundColor).toBe(NIGHT_ATLAS.paper);
  });
});
