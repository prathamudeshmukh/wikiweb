import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { ExploreScreen } from '../explore/ExploreScreen';
import { useInterests } from '../interests/InterestsContext';
import { useTheme } from '../theme/useTheme';

export default function Explore() {
  const { interests } = useInterests();
  const palette = useTheme();

  if (interests === undefined) return <View style={{ flex: 1, backgroundColor: palette.paper }} />;
  if (interests === null) return <Redirect href="/onboarding" />;
  return <ExploreScreen interests={interests} />;
}
