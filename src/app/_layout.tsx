import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AnalyticsRoot } from '../analytics/AnalyticsRoot';
import { HintsProvider } from '../hints/HintsContext';
import { InterestsProvider } from '../interests/InterestsContext';
import { AppServicesProvider, createAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';
import { TangentProvider } from '../tangent/TangentContext';
import { FONT_SOURCES } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

// Declaring screen options below would otherwise make the first declared screen the initial route.
export const unstable_settings = { initialRouteName: 'index' };

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
  const palette = useTheme();
  const [fontsLoaded, fontError] = useFonts(FONT_SOURCES);
  const result = useMemo(
    () =>
      createAppServices({
        wikiContact: process.env.EXPO_PUBLIC_WIKI_API_CONTACT,
        posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
        posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
        isDev: __DEV__,
      }),
    [],
  );
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (result.ok) result.services.journeys.load().catch((error: unknown) => reportError('journeys.load', error));
  }, [result]);

  useEffect(() => {
    if (fontError) reportError('fonts', fontError);
    if (ready) SplashScreen.hideAsync().catch((error: unknown) => reportError('splash', error));
  }, [ready, fontError]);

  if (!ready) return null;
  if (!result.ok) return <ConfigProblem problem={result.problem} />;

  return (
    // The root view shows through during screen transitions; paper here keeps them from flashing white.
    <GestureHandlerRootView style={[styles.root, { backgroundColor: palette.paper }]}>
      <SafeAreaProvider>
        <AppServicesProvider services={result.services}>
          <AnalyticsRoot>
            <InterestsProvider store={result.services.interests}>
              <HintsProvider store={result.services.hints} journeys={result.services.journeys}>
                <TangentProvider>
                  {/* Paper behind every screen, so dismissing the reader never flashes white. */}
                  <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: palette.paper } }}>
                    <Stack.Screen name="index" />
                    {/* The reader slides up over the column it was opened from (SPEC.md §3.4). */}
                    <Stack.Screen name="reader" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="logbook" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="expedition/[id]" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="settings/index" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="settings/interests" options={{ animation: 'slide_from_right' }} />
                  </Stack>
                  <StatusBar style="auto" />
                </TangentProvider>
              </HintsProvider>
            </InterestsProvider>
          </AnalyticsRoot>
        </AppServicesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  problem: { flex: 1, justifyContent: 'center', padding: 24 },
});
