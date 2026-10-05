import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FIND } from '../config/constants';
import { FindStar } from '../finds/FindStar';
import { FindThumb } from '../finds/FindThumb';
import type { Find } from '../finds/findTypes';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { territoryColor } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface FindsSectionProps {
  finds: readonly Find[];
  onOpenFind: (find: Find) => void;
  onSeeAll: () => void;
}

// DESIGN.md §6.5
const ITEM_WIDTH = 118;
const THUMB_HEIGHT = 88;
const BADGE = 20;
const BADGE_STAR = 11;
const ITEM_PADDING = 7;

function FindItem({ find, onOpen }: { find: Find; onOpen: () => void }) {
  const palette = useTheme();
  return (
    <Pressable
      ph-no-capture
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={find.title}
      style={({ pressed }) => [styles.item, { backgroundColor: palette.card, borderColor: palette.line }, pressed && styles.pressed]}
    >
      <View>
        <FindThumb find={find} width={ITEM_WIDTH - 2 * ITEM_PADDING} height={THUMB_HEIGHT} radius={9} />
        <View style={[styles.badge, { backgroundColor: palette.card }]}>
          <FindStar found size={BADGE_STAR} color={territoryColor(palette, find.territory)} outlineColor={palette.muted} />
        </View>
      </View>
      <Text style={[styles.itemTitle, { color: palette.ink }]} numberOfLines={2}>{find.title}</Text>
    </Pressable>
  );
}

/** `FINDS · {n}`: the latest finds, newest first, with See all → (SPEC.md §3.7). */
export function FindsSection({ finds, onOpenFind, onSeeAll }: FindsSectionProps) {
  const palette = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={[styles.eyebrow, { color: palette.muted }]}>{`FINDS · ${finds.length}`}</Text>
        {finds.length > 0 && (
          <Pressable onPress={onSeeAll} accessibilityRole="button" accessibilityLabel="See all finds" hitSlop={12}>
            <Text style={[styles.seeAll, { color: palette.ink }]}>See all →</Text>
          </Pressable>
        )}
      </View>
      {finds.length === 0 ? (
        <Text style={[styles.empty, { color: palette.muted }]}>Nothing found yet. Tap ✦ on anything worth keeping.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripContent}>
          {finds.slice(0, FIND.stripSize).map((find) => (
            <FindItem key={find.pageId} find={find} onOpen={() => onOpenFind(find)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eyebrow: { fontFamily: FONT.mono, ...TYPE.meta },
  seeAll: { fontFamily: FONT.body, fontStyle: 'italic', fontSize: 14 },
  empty: { fontFamily: FONT.body, ...TYPE.body },
  strip: { marginHorizontal: -LAYOUT.gutter },
  stripContent: { paddingHorizontal: LAYOUT.gutter, gap: 10 },
  item: { width: ITEM_WIDTH, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: ITEM_PADDING, paddingBottom: 10, gap: 7 },
  pressed: { opacity: 0.7 },
  badge: { position: 'absolute', top: 5, right: 5, width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: FONT.display, fontSize: 14, lineHeight: 17 },
});
