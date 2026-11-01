import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FeedbackRating } from '../analytics/events';
import { FEEDBACK } from '../config/constants';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { SHEET_COPY, SHEET_FINE_PRINT } from './feedbackCopy';
import { noteOf } from './feedbackRules';

interface FeedbackSheetProps {
  /** Already sent; the sheet only adds an optional note. */
  rating: FeedbackRating;
  onSend: (note: string) => void;
  onClose: () => void;
}

const SHEET_MS = 220;
const BACKDROP_OPACITY = 0.38;
const BUTTON_HEIGHT = 48;

/** The optional note after a thumb (SPEC.md §3.10). Closing loses nothing: the rating has gone already. */
export function FeedbackSheet({ rating, onSend, onClose }: FeedbackSheetProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const [typed, setTyped] = useState('');
  const copy = SHEET_COPY[rating];
  const canSend = noteOf(typed) !== null;

  // Home is the root, so Android back would otherwise leave the app with the sheet open.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  return (
    <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View entering={FadeIn.duration(SHEET_MS)} exiting={FadeOut.duration(SHEET_MS)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        // The note is free text: keep it out of touch autocapture (SPEC.md §11).
        ph-no-capture
        entering={SlideInDown.duration(SHEET_MS)}
        exiting={SlideOutDown.duration(SHEET_MS)}
        style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line, paddingBottom: insets.bottom + 16 }]}
        accessibilityViewIsModal
      >
        <Text style={[styles.thanks, { color: palette.muted }]}>{copy.thanks.toUpperCase()}</Text>
        <Text style={[styles.title, { color: palette.ink }]} accessibilityRole="header">{copy.title}</Text>
        <View style={[styles.input, { backgroundColor: palette.paper, borderColor: palette.line }]}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder={copy.placeholder}
            placeholderTextColor={palette.muted}
            maxLength={FEEDBACK.noteMaxLength}
            autoFocus
            returnKeyType="send"
            onSubmitEditing={() => canSend && onSend(typed)}
            accessibilityLabel="Your note"
            style={[styles.field, { color: palette.ink }]}
          />
          <Text style={[styles.count, { color: palette.muted }]}>{`${typed.length}/${FEEDBACK.noteMaxLength}`}</Text>
        </View>
        <Text style={[styles.fine, { color: palette.muted }]}>{SHEET_FINE_PRINT.toUpperCase()}</Text>
        <View style={styles.actions}>
          <Pressable onPress={onClose} accessibilityRole="button" style={[styles.skip, { borderColor: palette.line }]}>
            <Text style={[styles.label, { color: palette.ink }]}>SKIP</Text>
          </Pressable>
          <Pressable
            onPress={() => onSend(typed)}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            style={[styles.send, { backgroundColor: palette.ink }, !canSend && styles.disabled]}
          >
            <Text style={[styles.label, { color: palette.card }]}>SEND</Text>
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: `rgba(0,0,0,${BACKDROP_OPACITY})` },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, gap: 12, paddingTop: 20, paddingHorizontal: 20,
    borderTopLeftRadius: LAYOUT.cardRadius, borderTopRightRadius: LAYOUT.cardRadius, borderWidth: StyleSheet.hairlineWidth,
  },
  thanks: { fontFamily: FONT.mono, ...TYPE.meta },
  title: { fontFamily: FONT.display, fontSize: 22, lineHeight: 28 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: BUTTON_HEIGHT },
  field: { flex: 1, fontFamily: FONT.body, fontSize: 16, paddingVertical: 12 },
  count: { fontFamily: FONT.mono, ...TYPE.meta },
  fine: { fontFamily: FONT.monoLight, ...TYPE.meta },
  actions: { flexDirection: 'row', gap: 10 },
  skip: { flex: 1, height: BUTTON_HEIGHT, borderRadius: BUTTON_HEIGHT / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  send: { flex: 2, height: BUTTON_HEIGHT, borderRadius: BUTTON_HEIGHT / 2, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  label: { fontFamily: FONT.mono, fontSize: 12, letterSpacing: 0.8 },
});
