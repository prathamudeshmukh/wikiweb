import { TOPIC_TILES } from '../config/topicTiles';
import { TOPIC_ICONS } from './TopicIcon';

describe('topic icons', () => {
  it('gives every topic tile its own icon', () => {
    const icons = TOPIC_TILES.map((tile) => TOPIC_ICONS[tile.id]);

    expect(icons.every(Boolean)).toBe(true);
    expect(new Set(icons).size).toBe(TOPIC_TILES.length);
  });
});
