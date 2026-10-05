import { useEffect } from 'react';
import { FIND } from '../config/constants';
import { Toast } from '../nudges/Toast';
import { useAppServices } from '../services/AppServices';
import { useTheme } from '../theme/useTheme';
import type { FindNotice } from './findsStore';
import { FindStar } from './FindStar';
import { useFindsState } from './useFinds';

const TOAST_STAR_SIZE = 11;
const DURATION_MS: Readonly<Record<FindNotice['kind'], number>> = { kept: FIND.keptToastMs, removed: FIND.removedToastMs };

/**
 * `✦ Kept in Finds` / `Find removed · Undo` (DESIGN.md §8). Every screen with a ✦ hosts one; only the screen on top
 * (`active`) shows it, so a toast never plays behind the reader.
 */
export function FindToast({ active = true }: { active?: boolean }) {
  const palette = useTheme();
  const { finds } = useAppServices();
  const { notice } = useFindsState();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => finds.dismiss(notice.id), DURATION_MS[notice.kind]);
    return () => clearTimeout(timer);
  }, [finds, notice]);

  if (!active || !notice) return null;
  return notice.kind === 'kept' ? (
    <Toast key={notice.id} message="Kept in Finds" icon={<FindStar found size={TOAST_STAR_SIZE} color={palette.card} outlineColor={palette.card} />} />
  ) : (
    <Toast key={notice.id} message="Find removed" action={{ label: 'Undo', onPress: finds.undo }} />
  );
}
