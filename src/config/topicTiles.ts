export type Territory = 'life' | 'cosmos' | 'earth' | 'past' | 'culture' | 'mind' | 'craft';

export interface TopicTile {
  id: string;
  label: string;
  territory: Territory;
  /** `articletopic:` search keywords. Cirrus tags normalise to the same strings (see topics.ts). */
  searchTopics: readonly string[];
}

// SPEC.md §5.5 — every keyword verified against live search on 2026-10-01 (the last four on 2026-10-03).
export const TOPIC_TILES: readonly TopicTile[] = [
  { id: 'space', label: 'Space', territory: 'cosmos', searchTopics: ['space'] },
  { id: 'animals', label: 'Animals', territory: 'life', searchTopics: ['biology'] },
  { id: 'history', label: 'History', territory: 'past', searchTopics: ['history'] },
  { id: 'music', label: 'Music', territory: 'culture', searchTopics: ['music'] },
  { id: 'film', label: 'Film & TV', territory: 'culture', searchTopics: ['films', 'television'] },
  { id: 'food', label: 'Food', territory: 'life', searchTopics: ['food-and-drink'] },
  { id: 'sport', label: 'Sport', territory: 'craft', searchTopics: ['sports'] },
  { id: 'tech', label: 'Tech', territory: 'craft', searchTopics: ['computing', 'technology'] },
  { id: 'art', label: 'Art', territory: 'culture', searchTopics: ['visual-arts'] },
  { id: 'books', label: 'Books', territory: 'mind', searchTopics: ['literature'] },
  { id: 'places', label: 'Places', territory: 'earth', searchTopics: ['geographical'] },
  { id: 'philosophy', label: 'Philosophy', territory: 'mind', searchTopics: ['philosophy-and-religion'] },
  { id: 'science', label: 'Science', territory: 'cosmos', searchTopics: ['physics', 'chemistry'] },
  { id: 'maths', label: 'Maths', territory: 'cosmos', searchTopics: ['mathematics'] },
  { id: 'medicine', label: 'Medicine', territory: 'life', searchTopics: ['medicine-and-health'] },
  { id: 'games', label: 'Games', territory: 'culture', searchTopics: ['video-games'] },
  { id: 'earth', label: 'Earth', territory: 'earth', searchTopics: ['earth-and-environment'] },
  { id: 'society', label: 'Society', territory: 'past', searchTopics: ['society', 'politics-and-government'] },
  { id: 'business', label: 'Business', territory: 'past', searchTopics: ['business-and-economics'] },
  { id: 'transport', label: 'Transport', territory: 'earth', searchTopics: ['transportation'] },
  { id: 'architecture', label: 'Architecture', territory: 'earth', searchTopics: ['architecture'] },
  { id: 'engineering', label: 'Engineering', territory: 'craft', searchTopics: ['engineering'] },
  { id: 'comics', label: 'Comics & Anime', territory: 'culture', searchTopics: ['comics-and-anime'] },
  { id: 'military', label: 'Military', territory: 'past', searchTopics: ['military-and-warfare'] },
];

/** Territory for articles that only carry a broad bucket such as `STEM.STEM*` (SPEC.md §6 topic note). */
export const BROAD_BUCKET_TERRITORY: Readonly<Record<string, Territory>> = {
  STEM: 'cosmos',
  Culture: 'culture',
  Geography: 'earth',
  History_and_Society: 'past',
};
