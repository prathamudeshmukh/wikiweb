/**
 * One budget for every Wikipedia request (SPEC.md §6 throttling note: ~10 back-to-back requests, then 429).
 * A token bucket: a burst up to `capacity`, then one request per `refillIntervalMs`. Prefetch never dips into
 * the last `prefetchReserve` tokens, so what's on screen is never starved by what might be.
 */

export type LaneState = 'foreground' | 'prefetch' | 'cancelled';

/** Who a request is for. A prefetch lane is promoted when its column comes on screen, or cancelled when it won't. */
export interface Lane {
  readonly state: LaneState;
  promote(): void;
  cancel(): void;
}

export function createLane(initial: Exclude<LaneState, 'cancelled'>): Lane {
  let state: LaneState = initial;
  return {
    get state() {
      return state;
    },
    promote() {
      if (state === 'prefetch') state = 'foreground';
    },
    cancel() {
      state = 'cancelled';
    },
  };
}

/** Thrown to requests whose lane was cancelled before they got a turn. */
export class LaneCancelledError extends Error {
  constructor() {
    super('Prefetch cancelled.');
    this.name = 'LaneCancelledError';
  }
}

export interface RequestBudgetSettings {
  capacity: number;
  refillIntervalMs: number;
  prefetchReserve: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export interface RequestBudget {
  /** Resolves when the lane may send one request. */
  acquire(lane: Lane): Promise<void>;
}

export function createRequestBudget({ capacity, refillIntervalMs, prefetchReserve, now, sleep }: RequestBudgetSettings): RequestBudget {
  let tokens = capacity;
  let refilledAt = now();

  function refill() {
    const earned = Math.floor((now() - refilledAt) / refillIntervalMs);
    if (earned === 0) return;
    tokens = Math.min(capacity, tokens + earned);
    refilledAt = tokens === capacity ? now() : refilledAt + earned * refillIntervalMs;
  }

  const floorFor = (lane: Lane) => (lane.state === 'prefetch' ? prefetchReserve : 0);

  return {
    async acquire(lane) {
      for (;;) {
        if (lane.state === 'cancelled') throw new LaneCancelledError();
        refill();
        if (tokens - floorFor(lane) >= 1) {
          tokens -= 1;
          return;
        }
        await sleep(refillIntervalMs);
      }
    },
  };
}
