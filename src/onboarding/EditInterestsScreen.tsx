import { useCallback, useEffect, useState } from 'react';
import { BackHandler, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InterestTreeScreen } from '../interests/tree/InterestTreeScreen';
import type { TreeTarget } from '../interests/treeTarget';
import { ScreenHeader } from '../logbook/ScreenHeader';
import { useTheme } from '../theme/useTheme';
import { canContinue, canSave, MIN_INTERESTS } from './interestSelection';
import { pickerScreenStyles as layout } from './pickerScreenStyles';
import { PrimaryButton } from './PrimaryButton';
import { TopicPicker } from './TopicPicker';

interface EditInterestsScreenProps {
  saved: readonly string[];
  onSave: (picks: readonly string[]) => void;
  onBack: () => void;
  /** Opens straight into this tile's tree; its back still leads to the grid, where Save is. */
  initialTree?: TreeTarget;
}

/** Closes an open tree on Android back, before the screen itself would go. */
function useTreeBack(tree: TreeTarget | null, close: () => void) {
  useEffect(() => {
    if (!tree) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [tree, close]);
}

/** Re-opens the tile picker from Settings, starting from the saved picks (DESIGN.md §6.6, §5.13). */
export function EditInterestsScreen({ saved, onSave, onBack, initialTree }: EditInterestsScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<readonly string[]>(saved);
  // Picks made in a tree are a draft until Save on the grid.
  const [tree, setTree] = useState<TreeTarget | null>(initialTree ?? null);
  const closeTree = useCallback(() => setTree(null), []);
  useTreeBack(tree, closeTree);
  const saveHint = canContinue(selected) ? 'Change your picks to save' : `Pick at least ${MIN_INTERESTS} to save`;

  if (tree) {
    return (
      <View style={[layout.root, { backgroundColor: palette.paper, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <InterestTreeScreen tileId={tree.tileId} picks={selected} onChange={setSelected} onBack={closeTree} focusSubfieldId={tree.subfieldId} />
      </View>
    );
  }

  return (
    <View style={[layout.root, { backgroundColor: palette.paper, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScreenHeader title="INTERESTS" onBack={onBack} />
      <ScrollView contentContainerStyle={layout.content}>
        <Text style={[layout.heading, { color: palette.ink }]} accessibilityRole="header">Your corners of Wikipedia</Text>
        <Text style={[layout.intro, { color: palette.muted }]}>Home is built from these. Tiles marked with a branch can be narrowed.</Text>
        <TopicPicker selected={selected} onChange={setSelected} onOpenTree={(tileId) => setTree({ tileId })} />
      </ScrollView>
      <View style={layout.actions}>
        <PrimaryButton label="Save" enabled={canSave(saved, selected)} onPress={() => onSave(selected)} disabledHint={saveHint} />
      </View>
    </View>
  );
}
