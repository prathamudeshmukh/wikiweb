import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { MIN_INTERESTS, type OnboardingAction, onboardingAction } from './interestSelection';
import { pickerScreenStyles as layout } from './pickerScreenStyles';
import { PrimaryButton } from './PrimaryButton';
import { TopicPicker } from './TopicPicker';

interface OnboardingScreenProps {
  onDone: (tileIds: readonly string[]) => void;
  /** Started with nothing picked: the route saves the defaults, marked as not chosen. */
  onJustStart: () => void;
}

// The social preview card says the same (public/index.html), so a visitor lands on the promise they clicked.
const PITCH = 'Wikipedia, one swipe at a time';
const INTRO = 'Swipe left to follow a link and see where you end up. Pick a few topics to start from, or just start.';
const SET_OFF_HINT = `Pick at least ${MIN_INTERESTS} topics to set off`;

function OnboardingButton({ action, onSetOff, onJustStart }: { action: OnboardingAction; onSetOff: () => void; onJustStart: () => void }) {
  switch (action.kind) {
    case 'just_start':
      return <PrimaryButton label="Just start" enabled onPress={onJustStart} />;
    case 'pick_more':
      return <PrimaryButton label={`Pick ${action.missing} more`} enabled={false} arrow={false} onPress={onSetOff} disabledHint={SET_OFF_HINT} />;
    case 'set_off':
      return <PrimaryButton label="Set off" enabled onPress={onSetOff} />;
  }
}

export function OnboardingScreen({ onDone, onJustStart }: OnboardingScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<readonly string[]>([]);

  return (
    <View style={[layout.root, { backgroundColor: palette.paper, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={layout.content}>
        <Text style={[layout.heading, { color: palette.ink }]} accessibilityRole="header">{PITCH}</Text>
        <Text style={[layout.intro, { color: palette.muted }]}>{INTRO}</Text>
        <TopicPicker selected={selected} onChange={setSelected} />
      </ScrollView>
      <View style={layout.actions}>
        <OnboardingButton action={onboardingAction(selected)} onSetOff={() => onDone(selected)} onJustStart={onJustStart} />
      </View>
    </View>
  );
}

