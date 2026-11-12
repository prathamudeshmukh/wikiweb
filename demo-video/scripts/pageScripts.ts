/**
 * Scripts injected into the page before the app loads. Playwright serialises them with toString(),
 * so each must be self-contained: no imports, no outer variables.
 */

export interface DeterminismArgs {
  /** Epoch ms the HAR was recorded at; the page's clock starts there so date-keyed requests match. */
  recordedAt: number;
  seed: number;
}

/** Same clock and same Math.random on every take, so replay asks the HAR for exactly what record stored. */
export function pinClockAndRandom({ recordedAt, seed }: DeterminismArgs): void {
  const RealDate = Date;
  const shift = recordedAt - RealDate.now();
  const now = () => RealDate.now() + shift;
  // A function, not a class: `Date()` without `new` must still return a string, as the real one does.
  function PinnedDate(this: unknown, ...args: unknown[]): Date | string {
    if (!new.target) return new RealDate(now()).toString();
    return args.length === 0 ? new RealDate(now()) : Reflect.construct(RealDate, args, new.target);
  }
  PinnedDate.prototype = RealDate.prototype;
  PinnedDate.now = now;
  PinnedDate.parse = RealDate.parse;
  PinnedDate.UTC = RealDate.UTC;
  globalThis.Date = PinnedDate as unknown as DateConstructor;

  // mulberry32: tiny, well-distributed, deterministic.
  let state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A soft fingertip that follows the pointer while it is down, so taps and swipes read on video. */
export function showTouches(): void {
  if (window.top !== window) return;
  const SIZE = 44;
  const install = () => {
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'fixed',
      width: `${SIZE}px`,
      height: `${SIZE}px`,
      margin: `-${SIZE / 2}px 0 0 -${SIZE / 2}px`,
      borderRadius: '50%',
      background: 'rgba(31, 27, 22, 0.18)',
      border: '2px solid rgba(31, 27, 22, 0.35)',
      pointerEvents: 'none',
      zIndex: '2147483647',
      opacity: '0',
      transform: 'scale(0.6)',
      transition: 'opacity 120ms ease, transform 120ms ease',
    });
    document.body.appendChild(dot);
    const moveTo = (e: PointerEvent) => {
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    };
    const press = (down: boolean) => {
      dot.style.opacity = down ? '1' : '0';
      dot.style.transform = down ? 'scale(1)' : 'scale(0.6)';
    };
    window.addEventListener('pointerdown', (e) => (moveTo(e), press(true)), true);
    window.addEventListener('pointermove', moveTo, true);
    window.addEventListener('pointerup', () => press(false), true);
    window.addEventListener('pointercancel', () => press(false), true);
  };
  if (document.body) install();
  else document.addEventListener('DOMContentLoaded', install);
}
