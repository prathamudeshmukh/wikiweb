import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FindButton } from '../finds/FindButton';
import { findCaption } from '../finds/findFormat';
import { type FindActions, FindSheet } from '../finds/FindSheet';
import { FindThumb } from '../finds/FindThumb';
import { FindToast } from '../finds/FindToast';
import type { Find } from '../finds/findTypes';
import { useFindsState } from '../finds/useFinds';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { ScreenHeader } from './ScreenHeader';

interface FindsScreenProps {
  onBack: () => void;
  findActions: FindActions;
  isFocused?: boolean;
}

const THUMB = 52;
const STAR_SIZE = 16;

function FindRow({ find, onOpen }: { find: Find; onOpen: () => void }) {
  const palette = useTheme();
  const caption = findCaption(find);
  return (
    // ph-no-capture on the whole row: touches on its ✦ must not send anything that names the article (SPEC.md §11).
    <View ph-no-capture style={[styles.row, { borderColor: palette.line }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${find.title}. ${caption}`} style={({ pressed }) => [styles.open, pressed && styles.pressed]}>
        <FindThumb find={find} width={THUMB} height={THUMB} radius={10} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>{find.title}</Text>
          <Text style={[styles.caption, { color: palette.muted }]} numberOfLines={1}>{caption}</Text>
        </View>
      </Pressable>
      <FindButton page={find} from="list" size={STAR_SIZE} />
    </View>
  );
}

/** Every find, newest first (SPEC.md §3.7). A removed row goes at once; the toast can bring it back. */
export function FindsScreen({ onBack, findActions, isFocused = true }: FindsScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const { finds } = useFindsState();
  const [openFind, setOpenFind] = useState<Find | null>(null);
  return (
    <View style={[styles.root, { backgroundColor: palette.paper, paddingTop: insets.top }]}>
      <ScreenHeader title="FINDS" onBack={onBack} />
      <FlatList
        data={finds}
        keyExtractor={(find) => String(find.pageId)}
        renderItem={({ item }) => <FindRow find={item} onOpen={() => setOpenFind(item)} />}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + LAYOUT.gutter }]}
        ListEmptyComponent={<Text style={[styles.empty, { color: palette.muted }]}>Nothing found yet. Tap ✦ on anything worth keeping.</Text>}
      />
      {openFind && <FindSheet find={openFind} actions={findActions} onClose={() => setOpenFind(null)} />}
      <FindToast active={isFocused} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: LAYOUT.gutter },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pressed: { opacity: 0.7 },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: FONT.display, fontSize: 17, lineHeight: 21 },
  caption: { fontFamily: FONT.mono, fontSize: 10, lineHeight: 14, letterSpacing: 0.6, marginTop: 3 },
  empty: { fontFamily: FONT.body, ...TYPE.body, textAlign: 'center', paddingTop: 48 },
});
