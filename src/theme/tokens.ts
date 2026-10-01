import type { Territory } from '../config/topicTiles';

export interface Palette {
  paper: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  /** Text drawn on a territory colour block. */
  onTerritory: string;
  territory: Readonly<Record<Territory, string>>;
  /** Paper lifts cards with a shadow; Night atlas uses a hairline border instead (DESIGN.md §4). */
  cardShadow: boolean;
}

// DESIGN.md §2 — every text/background pair verified WCAG AA.
export const PAPER: Palette = {
  paper: '#F4EDE0',
  card: '#FBF7EF',
  ink: '#1F1B16',
  muted: '#6B6258',
  line: '#D9CFBF',
  onTerritory: '#FBF7EF',
  territory: { life: '#3F6B3A', cosmos: '#2E3A7A', earth: '#875C10', past: '#9A3B2E', culture: '#B23A5E', mind: '#6B3B66', craft: '#1F6F6B' },
  cardShadow: true,
};

export const NIGHT_ATLAS: Palette = {
  paper: '#1B1712',
  card: '#25201A',
  ink: '#EDE4D3',
  muted: '#A89C8A',
  line: '#3A332A',
  onTerritory: '#1B1712',
  territory: { life: '#8DB880', cosmos: '#9AA6E8', earth: '#D9A94F', past: '#E08A7A', culture: '#EE8FAA', mind: '#C493BF', craft: '#6BBDB6' },
  cardShadow: false,
};

/** The colour for a card's topic: its territory, or plain ink when it has none yet. */
export function territoryColor(palette: Palette, territory: Territory | null): string {
  return territory ? palette.territory[territory] : palette.ink;
}
