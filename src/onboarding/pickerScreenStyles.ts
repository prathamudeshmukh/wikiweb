import { StyleSheet } from 'react-native';
import { FONT } from '../theme/fonts';
import { LAYOUT } from '../theme/layout';

/** Layout shared by the screens built around the topic picker (onboarding, edit interests). */
export const pickerScreenStyles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: LAYOUT.gutter, paddingTop: 24, paddingBottom: 16, gap: 8 },
  heading: { fontFamily: FONT.display, fontSize: 34, lineHeight: 40 },
  intro: { fontFamily: FONT.body, fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: LAYOUT.gutter, paddingVertical: 12 },
});
