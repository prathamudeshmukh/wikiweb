import { Image } from 'expo-image';
import { ArrowRight, X } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppServices } from '../services/AppServices';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import type { Article } from '../wiki-api/types';

interface PeekCardProps {
  title: string;
  onTangent: (article: Article) => void;
  onRead: (article: Article) => void;
  onClose: () => void;
}

type Preview = { status: 'loading' } | { status: 'ready'; article: Article } | { status: 'error' };

const LOADING: Preview = { status: 'loading' };

const THUMB = 72;
const BUTTON_HEIGHT = 48;

/** Preview of a link tapped in the reader, with the two ways onward (DESIGN.md §5.8). */
export function PeekCard({ title, onTangent, onRead, onClose }: PeekCardProps) {
  const { api } = useAppServices();
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  // A preview is kept with the title it answers; a newly tapped title reads as loading until its own preview lands.
  const [settled, setSettled] = useState<{ title: string; preview: Preview } | null>(null);
  const preview: Preview = settled?.title === title ? settled.preview : LOADING;

  useEffect(() => {
    let current = true;
    const settle = (next: Preview) => current && setSettled({ title, preview: next });
    api
      .summary(title)
      .then((article) => settle({ status: 'ready', article }))
      .catch(() => settle({ status: 'error' }));
    return () => {
      current = false;
    };
  }, [api, title]);

  const article = preview.status === 'ready' ? preview.article : null;
  // A disambiguation page is a list of meanings, not a place to explore from.
  const canTangent = article !== null && !article.isDisambiguation;

  return (
    <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line, paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
      <View style={styles.row}>
        {article?.thumbnail ? <Image source={{ uri: article.thumbnail.url }} style={[styles.thumb, { borderColor: palette.line }]} contentFit="cover" /> : null}
        <View style={styles.text}>
          <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>{article?.title ?? title}</Text>
          {preview.status === 'loading' && <ActivityIndicator color={palette.muted} style={styles.spinner} />}
          {preview.status === 'error' && <Text style={[styles.meta, { color: palette.muted }]}>COULDN’T LOAD A PREVIEW</Text>}
          {article?.description ? <Text style={[styles.description, { color: palette.muted }]} numberOfLines={2}>{article.description}</Text> : null}
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close preview" hitSlop={12} style={styles.close}>
          <X size={18} color={palette.muted} />
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Pressable
          disabled={!canTangent}
          onPress={() => article && onTangent(article)}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canTangent }}
          style={[styles.primary, { backgroundColor: palette.ink, opacity: canTangent ? 1 : 0.4 }]}
        >
          <Text style={[styles.primaryLabel, { color: palette.card }]}>Take a tangent</Text>
          <ArrowRight size={18} color={palette.card} />
        </Pressable>
        <Pressable
          disabled={!article}
          onPress={() => article && onRead(article)}
          accessibilityRole="button"
          accessibilityState={{ disabled: !article }}
          style={[styles.secondary, { borderColor: palette.line, opacity: article ? 1 : 0.4 }]}
        >
          <Text style={[styles.secondaryLabel, { color: palette.ink }]}>Read</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, gap: 16, paddingTop: 20, paddingHorizontal: 20,
    borderTopLeftRadius: LAYOUT.cardRadius, borderTopRightRadius: LAYOUT.cardRadius, borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 12,
  },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  thumb: { width: THUMB, height: THUMB, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: FONT.display, fontSize: 22, lineHeight: 26 },
  description: { fontFamily: FONT.body, fontSize: 15, lineHeight: 22 },
  meta: { fontFamily: FONT.mono, ...TYPE.meta },
  spinner: { alignSelf: 'flex-start', marginTop: 6 },
  close: { width: LAYOUT.minTouchTarget, height: LAYOUT.minTouchTarget, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1, height: BUTTON_HEIGHT, borderRadius: BUTTON_HEIGHT / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryLabel: { fontFamily: FONT.bodyStrong, fontSize: 16 },
  secondary: { height: BUTTON_HEIGHT, paddingHorizontal: 24, borderRadius: BUTTON_HEIGHT / 2, borderWidth: 1, justifyContent: 'center' },
  secondaryLabel: { fontFamily: FONT.bodyStrong, fontSize: 16 },
});
