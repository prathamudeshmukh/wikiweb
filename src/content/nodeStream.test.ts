import type { PageRef } from '../wiki-api/types';
import { fakeWikiApi, idOf } from './__testing__/fakeWikiApi';
import { type ExhaustedNode, nodeStream, type NodeStreamOptions, type NodeRef } from './nodeStream';
import { onceStream, type Stream } from './refStream';

const titles = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
const STOICISM = 'incategory:Stoicism';
const ETHICS = 'incategory:Stoicism|Epicureanism|Utilitarianism|Virtue_ethics|Metaethics|Moral_psychology';
const ref = (title: string): PageRef => ({ pageId: idOf(title), title });

async function drain(stream: Stream<NodeRef>, limit = 100): Promise<NodeRef[]> {
  const out: NodeRef[] = [];
  for (let item = await stream.next(); item && out.length < limit; item = await stream.next()) out.push(item);
  return out;
}

function setup(overrides: Partial<NodeStreamOptions> & { searches?: Record<string, readonly string[]> } = {}) {
  const { searches = { [STOICISM]: titles('Stoic', 5) }, ...rest } = overrides;
  const fake = fakeWikiApi({ searches, pageSize: 20 });
  const exhausted: ExhaustedNode[] = [];
  const options: NodeStreamOptions = {
    api: fake.api,
    path: 'philosophy/ethics/stoicism',
    isRead: () => false,
    isEligible: () => true,
    random: () => 0.5,
    broadStream: () => onceStream(async () => [ref('Broad 1')]),
    onExhausted: (node) => exhausted.push(node),
    ...rest,
  };
  return { stream: nodeStream(options), fake, exhausted };
}

describe('nodeStream', () => {
  it('tags each article with the node it came from', async () => {
    const { stream } = setup();

    const first = await stream.next();

    expect(first?.node).toBe('philosophy/ethics/stoicism');
  });

  it('searches the node in relevance order, shuffled within each page', async () => {
    const { stream, fake } = setup({ random: () => 0 });

    const got = await drain(stream);

    expect(fake.calls.searches[0]).toEqual({ query: STOICISM, sort: 'relevance' });
    expect(got.map((r) => r.ref.title)).not.toEqual(titles('Stoic', 5));
    expect(new Set(got.map((r) => r.ref.title))).toEqual(new Set(titles('Stoic', 5)));
  });

  it('keeps the best-known articles ahead of the next page', async () => {
    const { stream } = setup({ searches: { [STOICISM]: titles('Stoic', 25) } });

    const firstPage = (await drain(stream)).slice(0, 20).map((r) => r.ref.title);

    expect(new Set(firstPage)).toEqual(new Set(titles('Stoic', 20)));
  });

  it('skips articles already read', async () => {
    const { stream } = setup({ isRead: (id) => id === idOf('Stoic 1') });

    const got = await drain(stream);

    expect(got.map((r) => r.ref.title)).not.toContain('Stoic 1');
  });

  it('ends without widening while some of the pool is unread', async () => {
    const { stream, exhausted } = setup({ isRead: (id) => id !== idOf('Stoic 3') });

    const got = await drain(stream);

    expect(got.map((r) => r.ref.title)).toEqual(['Stoic 3']);
    expect(exhausted).toEqual([]);
  });

  it('reports a node once every article in its pool is read, then widens to the parent', async () => {
    const { stream, exhausted } = setup({
      searches: { [STOICISM]: titles('Stoic', 3), [ETHICS]: ['Ethics 1'] },
      isRead: (id) => titles('Stoic', 3).map(idOf).includes(id),
    });

    const got = await drain(stream);

    expect(exhausted).toEqual([{ path: 'philosophy/ethics/stoicism', articleCount: 3 }]);
    expect(got).toEqual([{ ref: ref('Ethics 1'), node: 'philosophy/ethics' }]);
  });

  it('widens an exhausted subfield to the broad tile', async () => {
    const { stream, exhausted } = setup({ path: 'philosophy/ethics', searches: { [ETHICS]: ['Ethics 1'] }, isRead: (id) => id === idOf('Ethics 1') });

    const got = await drain(stream);

    expect(exhausted.map((e) => e.path)).toEqual(['philosophy/ethics']);
    expect(got).toEqual([{ ref: ref('Broad 1'), node: null }]);
  });

  it('notices exhaustion from reads made after the pool was listed', async () => {
    const read = new Set<number>();
    const { stream, exhausted } = setup({ searches: { [STOICISM]: ['Stoic 1'] }, isRead: (id) => read.has(id) });
    await drain(stream);

    read.add(idOf('Stoic 1'));
    await stream.next();

    expect(exhausted.map((e) => e.path)).toEqual(['philosophy/ethics/stoicism']);
  });

  it('leaves articles Home would never show out of the pool', async () => {
    const { stream, exhausted } = setup({
      searches: { [STOICISM]: ['Stoic 1', 'List of Stoics'] },
      isEligible: (title) => !title.startsWith('List of'),
      isRead: (id) => id === idOf('Stoic 1'),
    });

    await drain(stream);

    expect(exhausted).toEqual([{ path: 'philosophy/ethics/stoicism', articleCount: 1 }]);
  });

  it('never calls an empty node exhausted', async () => {
    const { stream, exhausted } = setup({ searches: { [STOICISM]: [] } });

    expect(await drain(stream)).toEqual([]);
    expect(exhausted).toEqual([]);
  });
});
