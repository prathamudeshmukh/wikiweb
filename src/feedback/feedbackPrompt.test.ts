import { memoryAnalytics } from '../analytics/__testing__/memoryAnalytics';
import { FEEDBACK } from '../config/constants';
import { createFeedbackPrompt } from './feedbackPrompt';
import { createFeedbackStore } from './feedbackStore';

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

interface SetupOptions {
  expeditions?: number;
  optedOut?: boolean | null;
  kvData?: Record<string, string>;
  load?: boolean;
}

async function setup({ expeditions = 2, optedOut = false, kvData = {}, load = true }: SetupOptions = {}) {
  const kv = memoryKv(kvData);
  const analytics = memoryAnalytics();
  let consent = optedOut;
  const feedback = createFeedbackPrompt({
    store: createFeedbackStore(kv),
    analytics,
    expeditionCount: async () => expeditions,
    isOptedOut: () => consent,
  });
  if (load) await feedback.load();
  const setOptedOut = (value: boolean) => {
    consent = value;
  };
  return { feedback, analytics, kv, setOptedOut };
}

describe('feedback prompt', () => {
  it('is due after the second expedition, asking through analytics', async () => {
    const { feedback } = await setup();

    expect(feedback.due()).toEqual({ kind: 'feedback', expeditions: 2, channel: 'analytics' });
  });

  it('is not due after only one expedition', async () => {
    const { feedback } = await setup({ expeditions: 1 });

    expect(feedback.due()).toBeNull();
  });

  it('counts an expedition started this session', async () => {
    const { feedback } = await setup({ expeditions: 1 });

    feedback.expeditionStarted();

    expect(feedback.due()?.expeditions).toBe(2);
  });

  it('asks by email when usage sharing is off', async () => {
    const { feedback } = await setup({ optedOut: true });

    expect(feedback.due()?.channel).toBe('email');
  });

  it('reports each impression and stops after the last one', async () => {
    const { feedback, analytics } = await setup();

    for (let i = 0; i < FEEDBACK.maxImpressions; i += 1) feedback.shown();

    expect(analytics.named('feedback_shown').map((p) => p.impression)).toEqual([1, 2, 3]);
    expect(feedback.due()).toBeNull();
  });

  it('keeps asking after a scroll-past, and reports it', async () => {
    const { feedback, analytics } = await setup();
    feedback.shown();

    feedback.dismissed('scrolled_past');

    expect(analytics.named('feedback_dismissed')).toEqual([{ how: 'scrolled_past', impression: 1 }]);
    expect(feedback.due()).not.toBeNull();
  });

  it('never asks again once swiped away', async () => {
    const { feedback } = await setup();
    feedback.shown();

    feedback.dismissed('swipe');

    expect(feedback.due()).toBeNull();
  });

  it('sends a rating straight away and never asks again', async () => {
    const { feedback, analytics } = await setup();
    feedback.shown();

    feedback.rated('down');

    expect(analytics.named('feedback_given')).toEqual([{ rating: 'down', expeditions: 2, impression: 1 }]);
    expect(feedback.due()).toBeNull();
  });

  it('sends a note with its rating, trimmed', async () => {
    const { feedback, analytics } = await setup();

    feedback.noted('up', '  Love the atlas ');

    expect(analytics.named('feedback_note')).toEqual([{ rating: 'up', note: 'Love the atlas' }]);
  });

  it('sends nothing for a blank note', async () => {
    const { feedback, analytics } = await setup();

    feedback.noted('up', '  ');

    expect(analytics.named('feedback_note')).toEqual([]);
  });

  it('never asks again once the email path is taken, without sending an event', async () => {
    const { feedback, analytics } = await setup({ optedOut: true });

    feedback.emailed();

    expect(feedback.due()).toBeNull();
    expect(analytics.events()).toEqual([]);
  });

  it('is never due before its saved progress has loaded, so nothing overwrites it', async () => {
    const { feedback } = await setup({ load: false });

    expect(feedback.due()).toBeNull();
  });

  it('is never due when its saved progress fails to load', async () => {
    const feedback = createFeedbackPrompt({
      store: { load: async () => Promise.reject(new Error('storage')), save: async () => undefined },
      analytics: memoryAnalytics(),
      expeditionCount: async () => 5,
      isOptedOut: () => false,
    });

    await expect(feedback.load()).rejects.toThrow('storage');

    expect(feedback.due()).toBeNull();
  });

  it('ignores expeditions set off while loading: the count may already hold them', async () => {
    const { feedback } = await setup({ expeditions: 1, load: false });

    feedback.expeditionStarted();
    await feedback.load();

    expect(feedback.due()).toBeNull();
  });

  it('waits for the usage-sharing choice before choosing how to ask', async () => {
    const { feedback } = await setup({ optedOut: null });

    expect(feedback.due()).toBeNull();
  });

  it('sends no rating and keeps the card for later when usage sharing was turned off meanwhile', async () => {
    const { feedback, analytics, setOptedOut } = await setup();
    setOptedOut(true);

    const sent = feedback.rated('up');

    expect(sent).toBe(false);
    expect(analytics.named('feedback_given')).toEqual([]);
    expect(feedback.due()?.channel).toBe('email');
  });

  it('sends a rating only once', async () => {
    const { feedback, analytics } = await setup();
    feedback.rated('up');

    const again = feedback.rated('up');

    expect(again).toBe(false);
    expect(analytics.named('feedback_given')).toHaveLength(1);
  });

  it('remembers its answer across launches', async () => {
    const first = await setup();
    first.feedback.rated('up');
    await first.feedback.whenSaved();

    const second = await setup({ kvData: first.kv.data });

    expect(second.feedback.due()).toBeNull();
  });

  it('starts fresh from unreadable saved values', async () => {
    const { feedback } = await setup({ kvData: { feedbackImpressions: 'lots', feedbackDone: '{' } });

    expect(feedback.due()).not.toBeNull();
  });
});
