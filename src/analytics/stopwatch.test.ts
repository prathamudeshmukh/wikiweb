import { createStopwatch } from './stopwatch';

function setup() {
  let clock = 0;
  const watch = createStopwatch(() => clock);
  return { watch, advance: (ms: number) => (clock += ms) };
}

describe('stopwatch', () => {
  it('adds up only the time it ran', () => {
    const { watch, advance } = setup();
    watch.start();
    advance(3_000);
    watch.stop();
    advance(60_000);
    watch.start();
    advance(2_000);

    expect(watch.seconds()).toBe(5);
  });

  it('ignores a second start or a stop while stopped', () => {
    const { watch, advance } = setup();
    watch.stop();
    watch.start();
    advance(1_000);
    watch.start();
    advance(1_000);

    expect(watch.seconds()).toBe(2);
  });
});
