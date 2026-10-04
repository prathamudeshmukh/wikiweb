import { memoryCompletedNodes } from '../__testing__/renderWithServices';
import { memoryAnalytics } from '../analytics/__testing__/memoryAnalytics';
import { createNudges } from './nudges';
import { createNudgeStore } from './nudgeStore';

function memoryKv(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: async (key: string) => data[key] ?? null,
    setItem: async (key: string, value: string) => {
      data[key] = value;
    },
  };
}

const PHILOSOPHY = { tileId: 'philosophy', territory: 'mind' as const };
const STOICISM = { path: 'philosophy/ethics/stoicism', articleCount: 37 };

async function setup(kvData: Record<string, string> = {}) {
  const kv = memoryKv(kvData);
  const analytics = memoryAnalytics();
  const completedNodes = memoryCompletedNodes();
  const nudges = createNudges({ store: createNudgeStore(kv), completedNodes, analytics, now: () => 1000 });
  await nudges.load();
  return { nudges, analytics, completedNodes, kv };
}

async function readPhilosophy(nudges: Awaited<ReturnType<typeof setup>>['nudges'], times: number) {
  for (let i = 0; i < times; i += 1) await nudges.articleRead(PHILOSOPHY);
}

describe('nudges', () => {
  it('has nothing to show at first', async () => {
    const { nudges } = await setup();

    expect(nudges.next(['philosophy'])).toBeNull();
  });

  it('offers a prompt after enough reads in a broad tree tile, and remembers the reads', async () => {
    const { nudges, kv } = await setup();

    await readPhilosophy(nudges, 3);

    expect(nudges.next(['philosophy'])).toEqual({ kind: 'prompt', tileId: 'philosophy', reads: 3 });
    expect(JSON.parse(kv.data.nicheReads)).toEqual({ philosophy: 3 });
  });

  it('shows at most one prompt per app session', async () => {
    const { nudges } = await setup({ nicheReads: JSON.stringify({ philosophy: 3, history: 3 }) });

    nudges.shown({ kind: 'prompt', tileId: 'philosophy', reads: 3 });

    expect(nudges.next(['philosophy', 'history'])).toBeNull();
  });

  it('never prompts again for a tile whose prompt was shown, across sessions', async () => {
    const first = await setup({ nicheReads: JSON.stringify({ philosophy: 3 }) });
    first.nudges.shown({ kind: 'prompt', tileId: 'philosophy', reads: 3 });
    await first.nudges.whenSaved();

    const second = await setup(first.kv.data);

    expect(second.nudges.next(['philosophy'])).toBeNull();
  });

  it('reports a prompt shown and dismissed', async () => {
    const { nudges, analytics } = await setup();

    nudges.shown({ kind: 'prompt', tileId: 'philosophy', reads: 3 });
    nudges.dismissed({ kind: 'prompt', tileId: 'philosophy', reads: 3 }, 'swipe');

    expect(analytics.named('niche_prompt_shown')).toEqual([{ tile: 'philosophy' }]);
    expect(analytics.named('niche_prompt_dismissed')).toEqual([{ tile: 'philosophy', how: 'swipe' }]);
  });

  it('offers an exhaustion card the first time a node runs dry, ahead of any prompt', async () => {
    const { nudges, analytics, completedNodes } = await setup({ nicheReads: JSON.stringify({ philosophy: 3 }) });

    await nudges.nodeExhausted(STOICISM);

    expect(nudges.next(['philosophy'])).toEqual({ kind: 'exhausted', node: STOICISM });
    await expect(completedNodes.list()).resolves.toEqual([{ nodePath: STOICISM.path, completedAt: 1000, articleCount: 37 }]);
    expect(analytics.named('niche_node_exhausted')).toEqual([{ node: STOICISM.path, articles: 37 }]);
  });

  it('shows an exhaustion card only once', async () => {
    const { nudges } = await setup();
    await nudges.nodeExhausted(STOICISM);

    nudges.shown({ kind: 'exhausted', node: STOICISM });

    expect(nudges.next(['philosophy/ethics/stoicism'])).toBeNull();
  });

  it('stays quiet when a node already completed runs dry again', async () => {
    const { nudges, analytics } = await setup();
    await nudges.nodeExhausted(STOICISM);
    nudges.shown({ kind: 'exhausted', node: STOICISM });

    await nudges.nodeExhausted(STOICISM);

    expect(nudges.next([])).toBeNull();
    expect(analytics.named('niche_node_exhausted')).toHaveLength(1);
  });

  it('tells subscribers when a nudge becomes available', async () => {
    const { nudges } = await setup();
    const listener = jest.fn();
    nudges.subscribe(listener);

    await nudges.nodeExhausted(STOICISM);

    expect(listener).toHaveBeenCalled();
  });

  it('treats unreadable stored progress as fresh', async () => {
    const { nudges } = await setup({ nicheReads: '{oops', nichePromptsSeen: '42' });

    await readPhilosophy(nudges, 3);

    expect(nudges.next(['philosophy'])).toEqual({ kind: 'prompt', tileId: 'philosophy', reads: 3 });
  });
});
