import { LAYOUT } from '../theme/layout';
import { FEED_SNAP as WEB_SNAP } from './feedSnap.web';

const BOTTOM_PADDING = LAYOUT.peek + 34;

describe('feed snapping on web', () => {
  it('rests each card where native does: just below the list top', () => {
    expect(WEB_SNAP.list).toEqual({ scrollSnapType: 'y mandatory', scrollPaddingTop: LAYOUT.listTopPadding });
  });

  it('keeps the very bottom a resting place, like native snapToEnd', () => {
    expect(WEB_SNAP.footer(BOTTOM_PADDING)).toEqual({ scrollSnapAlign: 'end', scrollMarginBottom: BOTTOM_PADDING });
  });
});
