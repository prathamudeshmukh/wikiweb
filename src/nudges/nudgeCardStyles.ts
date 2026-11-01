import { StyleSheet } from 'react-native';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';

// DESIGN.md §5.14: every card in Home's nudge slot shares this anatomy.
export const NUDGE_ICON_SIZE = 40;
const BLOCK_ASPECT = 10 / 16;
const MAX_BLOCK_SHARE = 0.34;

export const nudgeBlockHeight = (width: number, height: number) => Math.min(width * BLOCK_ASPECT, height * MAX_BLOCK_SHARE);

export const nudgeCardStyles = StyleSheet.create({
  card: { flex: 1, borderRadius: LAYOUT.cardRadius, overflow: 'hidden' },
  lift: { shadowColor: '#1F1B16', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  body: { flex: 1, padding: LAYOUT.cardPadding },
  block: { borderRadius: LAYOUT.imageRadius, padding: 16, justifyContent: 'space-between' },
  eyebrow: { fontFamily: FONT.mono, ...TYPE.meta, marginRight: 80 },
  title: { fontFamily: FONT.display, fontSize: 30, lineHeight: 34, marginRight: NUDGE_ICON_SIZE },
  icon: { position: 'absolute', right: 14, bottom: 12 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  metaText: { fontFamily: FONT.mono, ...TYPE.meta },
  copy: { fontFamily: FONT.body, fontSize: 16, lineHeight: 25, marginBottom: 14 },
  why: { marginTop: 'auto', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  whyLead: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  whyText: { fontFamily: FONT.monoLight, ...TYPE.meta, flexShrink: 1 },
});
