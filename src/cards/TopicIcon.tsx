import {
  Atom,
  Bank,
  BookOpen,
  Brain,
  ChartLineUp,
  Cpu,
  FilmSlate,
  FirstAidKit,
  ForkKnife,
  GameController,
  type Icon,
  MapPin,
  MathOperations,
  Mountains,
  MusicNotes,
  PaintBrush,
  PawPrint,
  Planet,
  SoccerBall,
  Train,
  UsersThree,
} from 'phosphor-react-native';

// DESIGN.md §9 topic icon map.
const TOPIC_ICONS: Readonly<Record<string, Icon>> = {
  space: Planet,
  animals: PawPrint,
  history: Bank,
  music: MusicNotes,
  film: FilmSlate,
  food: ForkKnife,
  sport: SoccerBall,
  tech: Cpu,
  art: PaintBrush,
  business: ChartLineUp,
  books: BookOpen,
  places: MapPin,
  philosophy: Brain,
  science: Atom,
  maths: MathOperations,
  medicine: FirstAidKit,
  games: GameController,
  earth: Mountains,
  society: UsersThree,
  transport: Train,
};

interface TopicIconProps {
  tileId: string | null;
  size: number;
  color: string;
}

export function TopicIcon({ tileId, size, color }: TopicIconProps) {
  const IconForTopic = (tileId && TOPIC_ICONS[tileId]) || BookOpen;
  return <IconForTopic size={size} color={color} weight="duotone" />;
}
