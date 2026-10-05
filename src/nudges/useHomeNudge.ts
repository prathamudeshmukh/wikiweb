import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TreeOpenedFrom } from '../analytics/events';
import { NICHE } from '../config/constants';
import { addPick, tileOf } from '../interests/interestPicks';
import type { TreeTarget } from '../interests/treeTarget';
import { useAppServices } from '../services/AppServices';
import { reportError } from '../services/reportError';
import { type Chip, chipChoices, type Nudge } from './nudgeRules';

/** What Home's nudge card can do outside Home (provided by the route). */
export interface NicheActions {
  addPicks(picks: readonly string[], from: 'prompt' | 'exhaustion'): Promise<void>;
  openTree(target: TreeTarget, from: TreeOpenedFrom): void;
}

interface HomeNudgeOptions {
  interests: readonly string[];
  /** Goes up with each fresh Home; a new Home gets whatever nudge is due. */
  generation: number;
  cardCount: number;
  niche: NicheActions;
}

/** `dismissed` stays in the list (scrolled past) so it never jumps; `removed` was swiped away. */
type Status = 'active' | 'dismissed' | 'removed';

interface Attached {
  nudge: Nudge;
  index: number;
  seen: boolean;
  status: Status;
}

export interface HomeNudgeView {
  nudge: Nudge | null;
  /** Where the nudge sits among Home's cards; null when there is none to show. */
  index: number | null;
  chips: readonly Chip[];
  pickedChips: ReadonlySet<string>;
  toast: string | null;
  onChip(chip: Chip): void;
  onOpenTree(): void;
  onDismiss(): void;
  onVisible(visible: boolean): void;
}

const NO_CHIPS: ReadonlySet<string> = new Set();

const toggled = (set: ReadonlySet<string>, path: string): ReadonlySet<string> =>
  set.has(path) ? new Set([...set].filter((p) => p !== path)) : new Set([...set, path]);

const tileOfNudge = (nudge: Nudge) => (nudge.kind === 'prompt' ? nudge.tileId : tileOf(nudge.node.path));

/** Chips settle: every chip tapped is added in one save, NICHE.chipSettleMs after the last tap (SPEC.md §3.9). */
function useChipSettle(attached: Attached | null, interests: readonly string[], niche: NicheActions) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(NO_CHIPS);
  const [toast, setToast] = useState<string | null>(null);
  const chips = useMemo(() => (attached ? chipChoices(attached.nudge, interests) : []), [attached, interests]);

  useEffect(() => {
    if (picked.size === 0 || !attached) return undefined;
    const timer = setTimeout(() => {
      const paths = [...picked];
      const labels = chips.filter((chip) => picked.has(chip.path)).map((chip) => chip.label);
      setToast(`Added ${labels.join(', ')} · Home is rebuilding`);
      const from = attached.nudge.kind === 'prompt' ? 'prompt' : 'exhaustion';
      niche.addPicks(paths.reduce(addPick, [...interests]), from).catch((error: unknown) => reportError('nudges.addPicks', error));
    }, NICHE.chipSettleMs);
    return () => clearTimeout(timer);
  }, [picked, attached, chips, interests, niche]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), NICHE.toastMs);
    return () => clearTimeout(timer);
  }, [toast]);

  const onChip = useCallback((chip: Chip) => setPicked((current) => toggled(current, chip.path)), []);
  const reset = useCallback(() => setPicked(NO_CHIPS), []);
  return { chips, picked, toast, onChip, reset };
}

/** Home's nudge card (SPEC.md §3.9): where it sits, and what its chips, swipe and visibility do. */
export function useHomeNudge({ interests, generation, cardCount, niche }: HomeNudgeOptions): HomeNudgeView {
  const { nudges } = useAppServices();
  const [attached, setAttached] = useState<Attached | null>(null);
  const settle = useChipSettle(attached, interests, niche);
  const { reset } = settle;
  // Read inside listeners that must not resubscribe on every scroll or save.
  const live = useRef({ attached, interests, cardCount });
  useEffect(() => {
    live.current = { attached, interests, cardCount };
  }, [attached, interests, cardCount]);

  // A fresh Home: whatever nudge is due goes a few cards in.
  useEffect(() => {
    const nudge = nudges.next(live.current.interests);
    setAttached(nudge ? { nudge, index: NICHE.minIndex, seen: false, status: 'active' } : null);
    reset();
  }, [generation, nudges, reset]);

  // A node found exhausted mid-scroll goes after the cards already loaded, so it comes next.
  useEffect(
    () =>
      nudges.subscribe(() => {
        const current = live.current.attached;
        if (current && current.status !== 'removed') return;
        const nudge = nudges.next(live.current.interests);
        if (nudge) setAttached({ nudge, index: Math.max(NICHE.minIndex, live.current.cardCount), seen: false, status: 'active' });
      }),
    [nudges],
  );

  const onVisible = useCallback(
    (visible: boolean) => {
      const current = live.current.attached;
      if (!current || current.status !== 'active') return;
      if (visible && !current.seen) {
        nudges.shown(current.nudge);
        setAttached({ ...current, seen: true });
      } else if (!visible && current.seen && settle.picked.size === 0) {
        nudges.dismissed(current.nudge, 'scrolled_past');
        setAttached({ ...current, status: 'dismissed' });
      }
    },
    [nudges, settle.picked],
  );

  const onDismiss = useCallback(() => {
    const current = live.current.attached;
    if (!current) return;
    if (current.status === 'active') nudges.dismissed(current.nudge, 'swipe');
    setAttached({ ...current, status: 'removed' });
  }, [nudges]);

  const onOpenTree = useCallback(() => {
    const current = live.current.attached;
    if (current) niche.openTree({ tileId: tileOfNudge(current.nudge) }, 'prompt');
  }, [niche]);

  const showing = attached && attached.status !== 'removed' ? attached : null;
  return {
    nudge: showing?.nudge ?? null,
    index: showing?.index ?? null,
    chips: settle.chips,
    pickedChips: settle.picked,
    toast: settle.toast,
    onChip: settle.onChip,
    onOpenTree,
    onDismiss,
    onVisible,
  };
}
