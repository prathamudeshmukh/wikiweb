import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InterestsProvider } from '../interests/InterestsContext';
import { AppServicesProvider, createAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';
import { FONT_SOURCES } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

SplashScreen.preventAutoHideAsync().catch((error: unknown) => reportError('splash', error));

/** Shown instead of the app when required configuration is missing — a developer error, so be specific. */
function ConfigProblem({ problem }: { problem: string }) {
  const palette = useTheme();
  return (
    <View style={[styles.problem, { backgroundColor: palette.paper }]}>
      <Text style={{ color: palette.ink, fontSize: 16, lineHeight: 24 }}>{problem}</Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_SOURCES);
  const result = useMemo(() => createAppServices(process.env.EXPO_PUBLIC_WIKI_API_CONTACT), []);
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontError) reportError('fonts', fontError);
    if (ready) SplashScreen.hideAsync().catch((error: unknown) => reportError('splash', error));
  }, [ready, fontError]);

  if (!ready) return null;
  if (!result.ok) return <ConfigProblem problem={result.problem} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppServicesProvider services={result.services}>
          <InterestsProvider store={result.services.interests}>
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
            <StatusBar style="auto" />
          </InterestsProvider>
        </AppServicesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  problem: { flex: 1, justifyContent: 'center', padding: 24 },
});
