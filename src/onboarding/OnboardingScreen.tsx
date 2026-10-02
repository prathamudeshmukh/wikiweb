import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';
import { canContinue, DEFAULT_INTERESTS } from './interestSelection';
import { pickerScreenStyles as layout } from './pickerScreenStyles';
import { PrimaryButton } from './PrimaryButton';
import { TopicPicker } from './TopicPicker';

interface OnboardingScreenProps {
  onDone: (tileIds: readonly string[]) => void;
}

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<readonly string[]>([]);

  return (
    <View style={[layout.root, { backgroundColor: palette.paper, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={layout.content}>
        <Text style={[layout.heading, { color: palette.ink }]} accessibilityRole="header">Where shall we start?</Text>
        <Text style={[layout.intro, { color: palette.muted }]}>Pick the corners of Wikipedia you like. Your first feed starts there, then you can wander anywhere.</Text>
        <TopicPicker selected={selected} onChange={setSelected} />
      </ScrollView>
      <View style={layout.actions}>
        <PrimaryButton label="Set off" enabled={canContinue(selected)} onPress={() => onDone(selected)} />
        <Pressable onPress={() => onDone(DEFAULT_INTERESTS)} accessibilityRole="button" hitSlop={8} style={styles.skip}>
          <Text style={[styles.skipLabel, { color: palette.muted }]}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skip: { height: 52, paddingHorizontal: 18, justifyContent: 'center' },
  skipLabel: { fontFamily: FONT.body, fontSize: 16 },
});
