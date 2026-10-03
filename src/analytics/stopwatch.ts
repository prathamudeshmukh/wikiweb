const MS_PER_SECOND = 1000;

/** Adds up the time between starts and stops (for `first_hop`'s seconds on Home). */
export interface Stopwatch {
  start(): void;
  stop(): void;
  seconds(): number;
}

export function createStopwatch(now: () => number): Stopwatch {
  let banked = 0;
  let runningSince: number | null = null;
  const running = () => (runningSince === null ? 0 : now() - runningSince);

  return {
    start() {
      if (runningSince === null) runningSince = now();
    },
    stop() {
      banked += running();
      runningSince = null;
    },
    seconds: () => Math.round((banked + running()) / MS_PER_SECOND),
  };
}
