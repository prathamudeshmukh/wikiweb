import { ArrowRight } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { FindButton } from './FindButton';
import { findSheetCaption } from './findFormat';
import { FindThumb } from './FindThumb';
import type { Find } from './findTypes';

/** What opening a find leads to (SPEC.md §3.7). */
export interface FindActions {
  /** Sets off on a new expedition from the find. */
  tangent: (find: Find) => void;
  read: (find: Find) => void;
}

interface FindSheetProps {
  find: Find;
  actions: FindActions;
  onClose: () => void;
}

const THUMB = 64;
const STAR_SIZE = 18;
const BUTTON_HEIGHT = 48;
const SHEET_MS = 220;
const BACKDROP_OPACITY = 0.38;

/** The peek card for a find (DESIGN.md §5.8, §5.11): ✦ in the title row, then Take a tangent / Read. */
export function FindSheet({ find, actions, onClose }: FindSheetProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(SHEET_MS)} exiting={FadeOut.duration(SHEET_MS)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        ph-no-capture
        entering={SlideInDown.duration(SHEET_MS)}
        exiting={SlideOutDown.duration(SHEET_MS)}
        style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line, paddingBottom: insets.bottom + 16 }]}
        accessibilityViewIsModal
      >
        <View style={styles.row}>
          <FindThumb find={find} width={THUMB} height={THUMB} radius={12} />
          <View style={styles.text}>
            <Text style={[styles.title, { color: palette.ink }]} numberOfLines={3} accessibilityRole="header">{find.title}</Text>
          </View>
          <FindButton page={find} from="peek" size={STAR_SIZE} />
        </View>
        <Text style={[styles.caption, { color: palette.muted }]}>{findSheetCaption(find)}</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => actions.tangent(find)} accessibilityRole="button" style={[styles.primary, { backgroundColor: palette.ink }]}>
            <Text style={[styles.primaryLabel, { color: palette.card }]}>Take a tangent</Text>
            <ArrowRight size={18} color={palette.card} />
          </Pressable>
          <Pressable onPress={() => actions.read(find)} accessibilityRole="button" style={[styles.secondary, { borderColor: palette.line }]}>
            <Text style={[styles.secondaryLabel, { color: palette.ink }]}>Read</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: `rgba(0,0,0,${BACKDROP_OPACITY})` },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14, paddingTop: 20, paddingHorizontal: 20,
    borderTopLeftRadius: LAYOUT.cardRadius, borderTopRightRadius: LAYOUT.cardRadius, borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  text: { flex: 1, minWidth: 0, paddingTop: 4 },
  title: { fontFamily: FONT.display, fontSize: 22, lineHeight: 26 },
  caption: { fontFamily: FONT.monoLight, ...TYPE.meta },
  actions: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1, height: BUTTON_HEIGHT, borderRadius: BUTTON_HEIGHT / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryLabel: { fontFamily: FONT.bodyStrong, fontSize: 16 },
  secondary: { height: BUTTON_HEIGHT, paddingHorizontal: 24, borderRadius: BUTTON_HEIGHT / 2, borderWidth: 1, justifyContent: 'center' },
  secondaryLabel: { fontFamily: FONT.bodyStrong, fontSize: 16 },
});
