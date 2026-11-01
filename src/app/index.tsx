import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useInterests } from '../interests/InterestsContext';
import { deferredScreen } from '../routes/deferredScreen';
import { useTheme } from '../theme/useTheme';

const HomeRoute = deferredScreen('HomeRoute');

/** Decided here, in the first bundle, so a new visitor reaches onboarding without waiting for Home's code. */
export default function Home() {
  const { interests } = useInterests();
  const palette = useTheme();
  if (interests === undefined) return <View style={{ flex: 1, backgroundColor: palette.paper }} />;
  if (interests === null) return <Redirect href="/onboarding" />;
  return <HomeRoute interests={interests} />;
}
