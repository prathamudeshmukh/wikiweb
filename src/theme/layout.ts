// DESIGN.md §4 and the M0 prototype (validated on device).
export const LAYOUT = {
  gutter: 16,
  headerHeight: 56,
  breadcrumbHeight: 44,
  seedHeaderHeight: 56,
  seedHeaderGap: 8,
  listTopPadding: 8,
  cardGap: 12,
  /** Visible top of the next card, so it's clear the column continues. */
  peek: 56,
  cardRadius: 20,
  cardPadding: 20,
  imageRadius: 14,
  imageAspect: 16 / 10,
  seedRadius: 14,
  homeRubberBandMax: 24,
  homeRubberBandFalloff: 120,
  backCommitDurationMs: 220,
  firstCardRiseOffset: 24,
  routeSegmentWidth: 14,
  maxVisibleCrumbs: 4,
  minTouchTarget: 44,
} as const;

export const TYPE = {
  cardTitle: { fontSize: 28, lineHeight: 32 },
  typographicTitle: { fontSize: 34, lineHeight: 38 },
  body: { fontSize: 17, lineHeight: 27 },
  meta: { fontSize: 11, lineHeight: 16, letterSpacing: 0.9 },
  crumb: { fontSize: 12, lineHeight: 16, letterSpacing: 0.7 },
  extractLines: 4,
} as const;
