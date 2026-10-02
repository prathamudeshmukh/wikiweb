import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../logbook/ScreenHeader';
import { useTheme } from '../theme/useTheme';
import { canContinue, canSave, MIN_INTERESTS } from './interestSelection';
import { pickerScreenStyles as layout } from './pickerScreenStyles';
import { PrimaryButton } from './PrimaryButton';
import { TopicPicker } from './TopicPicker';

interface EditInterestsScreenProps {
  saved: readonly string[];
  onSave: (tileIds: readonly string[]) => void;
  onBack: () => void;
}

/** Re-opens the tile picker from Settings, starting from the saved picks (DESIGN.md §6.6). */
export function EditInterestsScreen({ saved, onSave, onBack }: EditInterestsScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<readonly string[]>(saved);
  const saveHint = canContinue(selected) ? 'Change your picks to save' : `Pick at least ${MIN_INTERESTS} to save`;

  return (
    <View style={[layout.root, { backgroundColor: palette.paper, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScreenHeader title="INTERESTS" onBack={onBack} />
      <ScrollView contentContainerStyle={layout.content}>
        <Text style={[layout.heading, { color: palette.ink }]} accessibilityRole="header">Your corners of Wikipedia</Text>
        <Text style={[layout.intro, { color: palette.muted }]}>Home is built from these. Change them and it starts over from your new picks.</Text>
        <TopicPicker selected={selected} onChange={setSelected} />
      </ScrollView>
      <View style={layout.actions}>
        <PrimaryButton label="Save" enabled={canSave(saved, selected)} onPress={() => onSave(selected)} disabledHint={saveHint} />
      </View>
    </View>
  );
}
