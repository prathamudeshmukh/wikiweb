/** How far the user has got with the first-hop hints (SPEC.md §4.4). */
export interface HintProgress {
  /** The Home peel and chip are done: the user has hopped at least once. */
  swipeHintShown: boolean;
  /** The back chip is done: the user has returned from a column at least once. */
  backHintShown: boolean;
  /** Peels played before the first hop, for the `first_hop` event (SPEC.md §11). */
  peelsSeen: number;
}

export const FRESH_PROGRESS: HintProgress = { swipeHintShown: false, backHintShown: false, peelsSeen: 0 };

export const afterFirstHop = (progress: HintProgress): HintProgress =>
  progress.swipeHintShown ? progress : { ...progress, swipeHintShown: true };

export const afterFirstReturn = (progress: HintProgress): HintProgress =>
  progress.backHintShown ? progress : { ...progress, backHintShown: true };

export const afterPeel = (progress: HintProgress): HintProgress =>
  progress.swipeHintShown ? progress : { ...progress, peelsSeen: progress.peelsSeen + 1 };

/** Someone with Journeys from before the hints existed has learned both gestures (returning Home ended those expeditions). */
export const knownExplorer = (progress: HintProgress): HintProgress => afterFirstReturn(afterFirstHop(progress));
