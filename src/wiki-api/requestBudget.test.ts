import { createLane, createRequestBudget, LaneCancelledError } from './requestBudget';

const SETTINGS = { capacity: 4, refillIntervalMs: 100, prefetchReserve: 2 };

/** A budget on a fake clock: sleeping advances time instantly. */
function setup() {
  let time = 0;
  const sleeps: number[] = [];
  const budget = createRequestBudget({
    ...SETTINGS,
    now: () => time,
    sleep: async (ms) => {
      sleeps.push(ms);
      time += ms;
    },
  });
  const elapsed = () => time;
  const idle = (ms: number) => {
    time += ms;
  };
  return { budget, sleeps, elapsed, idle };
}

const times = async (count: number, acquire: () => Promise<void>) => {
  for (let i = 0; i < count; i += 1) await acquire();
};

describe('createRequestBudget', () => {
  it('lets a burst up to its capacity straight through', async () => {
    const { budget, sleeps } = setup();

    await times(4, () => budget.acquire(createLane('foreground')));

    expect(sleeps).toEqual([]);
  });

  it('makes requests beyond the burst wait for a refill', async () => {
    const { budget, elapsed } = setup();

    await times(6, () => budget.acquire(createLane('foreground')));

    expect(elapsed()).toBe(200);
  });

  it('refills over idle time, but never beyond capacity', async () => {
    const { budget, idle, sleeps } = setup();
    await times(4, () => budget.acquire(createLane('foreground')));
    idle(10_000);

    await times(5, () => budget.acquire(createLane('foreground')));

    expect(sleeps).toEqual([100]);
  });

  it('keeps a reserve that prefetch cannot touch but on-screen requests can', async () => {
    const { budget, sleeps } = setup();
    await times(2, () => budget.acquire(createLane('prefetch')));

    await times(2, () => budget.acquire(createLane('foreground')));

    expect(sleeps).toEqual([]);
  });

  it('makes prefetch wait once only the reserve is left', async () => {
    const { budget, elapsed } = setup();
    await times(2, () => budget.acquire(createLane('foreground')));

    await budget.acquire(createLane('prefetch'));

    expect(elapsed()).toBe(100);
  });

  it('lets a promoted prefetch lane use the reserve', async () => {
    const { budget, sleeps } = setup();
    const lane = createLane('prefetch');
    await times(2, () => budget.acquire(createLane('foreground')));
    lane.promote();

    await budget.acquire(lane);

    expect(sleeps).toEqual([]);
  });

  it('rejects requests on a cancelled lane, even while they wait', async () => {
    const { budget } = setup();
    const lane = createLane('prefetch');
    await times(2, () => budget.acquire(createLane('foreground')));
    const waiting = budget.acquire(lane);
    lane.cancel();

    await expect(waiting).rejects.toBeInstanceOf(LaneCancelledError);
  });
});

describe('createLane', () => {
  it('cannot be revived once cancelled', () => {
    const lane = createLane('prefetch');

    lane.cancel();
    lane.promote();

    expect(lane.state).toBe('cancelled');
  });
});
