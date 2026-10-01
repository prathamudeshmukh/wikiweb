import { createWikiHttp, WikiApiError } from './http';

type FakeResponse = { ok: boolean; status: number; json: () => Promise<unknown>; text?: () => Promise<string>; headers?: { get(name: string): string | null } };
type FetchFn = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<FakeResponse>;

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => String(body) });
const fail = (status: number, retryAfter?: string) => ({
  ok: false,
  status,
  json: async () => ({}),
  headers: { get: (name: string) => (name.toLowerCase() === 'retry-after' ? (retryAfter ?? null) : null) },
});

// Responses are thunks so rejected promises are only created when the client actually makes the request.
function setup(responses: (() => ReturnType<FetchFn>)[]) {
  const calls: { url: string; headers?: Record<string, string> }[] = [];
  const delays: number[] = [];
  const queue = [...responses];
  const signals: (AbortSignal | undefined)[] = [];
  const fetchFn: FetchFn = (url, init) => {
    calls.push({ url, headers: init?.headers });
    signals.push(init?.signal);
    const next = queue.shift();
    if (!next) throw new Error('unexpected extra request');
    return next();
  };
  const http = createWikiHttp({
    fetchFn,
    timeoutMs: 20,
    userAgent: 'Tangent/test (contact@example.org)',
    sleep: async (ms) => {
      delays.push(ms);
    },
  });
  return { http, calls, delays, signals };
}

describe('createWikiHttp', () => {
  it('sends action API params with the standard format flags and user agent', async () => {
    const { http, calls } = setup([() => Promise.resolve(ok({ query: {} }))]);

    await http.query({ titles: 'Octopus', prop: 'description' });

    const url = new URL(calls[0].url);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: 'query', format: 'json', formatversion: '2', origin: '*', titles: 'Octopus', prop: 'description',
    });
    // Native apps can set the real User-Agent (Wikimedia policy); Api-User-Agent covers browser builds where it is locked.
    expect(calls[0].headers).toEqual({ 'User-Agent': 'Tangent/test (contact@example.org)', 'Api-User-Agent': 'Tangent/test (contact@example.org)' });
  });

  it('fetches REST paths under the REST base URL', async () => {
    const { http, calls } = setup([() => Promise.resolve(ok({ tfa: null }))]);

    const body = await http.rest('/feed/featured/2026/10/01');

    expect(calls[0].url).toBe('https://en.wikipedia.org/api/rest_v1/feed/featured/2026/10/01');
    expect(body).toEqual({ tfa: null });
  });

  it('fetches REST paths as text for HTML documents', async () => {
    const { http, calls } = setup([() => Promise.resolve(ok('<html>Ink</html>'))]);

    await expect(http.restText('/page/mobile-html/Ink')).resolves.toBe('<html>Ink</html>');
    expect(calls[0].url).toBe('https://en.wikipedia.org/api/rest_v1/page/mobile-html/Ink');
  });

  it('retries server errors with exponential backoff, then succeeds', async () => {
    const { http, delays } = setup([() => Promise.resolve(fail(503)), () => Promise.resolve(fail(429)), () => Promise.resolve(ok({ query: {} }))]);

    await expect(http.query({ titles: 'Octopus' })).resolves.toEqual({ query: {} });
    expect(delays).toEqual([300, 600]);
  });

  it('waits as long as Retry-After asks before retrying a 429', async () => {
    const { http, delays } = setup([() => Promise.resolve(fail(429, '2')), () => Promise.resolve(ok({ query: {} }))]);

    await http.query({ titles: 'Octopus' });

    expect(delays).toEqual([2000]);
  });

  it('caps very long Retry-After values', async () => {
    const { http, delays } = setup([() => Promise.resolve(fail(429, '3600')), () => Promise.resolve(ok({ query: {} }))]);

    await http.query({ titles: 'Octopus' });

    expect(delays).toEqual([10000]);
  });

  it('retries network failures', async () => {
    const { http } = setup([() => Promise.reject(new TypeError('Network request failed')), () => Promise.resolve(ok({ query: {} }))]);

    await expect(http.query({ titles: 'Octopus' })).resolves.toEqual({ query: {} });
  });

  it('gives up after the configured attempts with a WikiApiError', async () => {
    const { http, calls } = setup([() => Promise.resolve(fail(503)), () => Promise.resolve(fail(503)), () => Promise.resolve(fail(503))]);

    await expect(http.query({ titles: 'Octopus' })).rejects.toMatchObject({ name: 'WikiApiError', status: 503 });
    expect(calls).toHaveLength(3);
  });

  it('treats a response without a numeric status as a retryable network failure', async () => {
    const malformed = { ok: false, status: undefined as unknown as number, json: async () => ({}) };
    const { http, calls } = setup([() => Promise.resolve(malformed), () => Promise.resolve(ok({ query: {} }))]);

    await expect(http.query({ titles: 'Octopus' })).resolves.toEqual({ query: {} });
    expect(calls).toHaveLength(2);
  });

  it('retries when the API reports a transient error inside a 200 response', async () => {
    const { http, calls } = setup([() => Promise.resolve(ok({ error: { code: 'ratelimited', info: 'Slow down' } })), () => Promise.resolve(ok({ query: {} }))]);

    await expect(http.query({ titles: 'Octopus' })).resolves.toEqual({ query: {} });
    expect(calls).toHaveLength(2);
  });

  it('fails without retrying when the API reports a permanent error inside a 200 response', async () => {
    const { http, calls } = setup([() => Promise.resolve(ok({ error: { code: 'missingtitle', info: "The page you specified doesn't exist." } }))]);

    await expect(http.query({ titles: 'Nope' })).rejects.toMatchObject({ name: 'WikiApiError', code: 'missingtitle' });
    expect(calls).toHaveLength(1);
  });

  it('treats an unreadable body as a retryable network failure', async () => {
    const garbled = { ok: true, status: 200, json: async () => JSON.parse('<html>') };
    const { http, calls } = setup([() => Promise.resolve(garbled), () => Promise.resolve(ok({ query: {} }))]);

    await expect(http.query({ titles: 'Octopus' })).resolves.toEqual({ query: {} });
    expect(calls).toHaveLength(2);
  });

  it('aborts a request that takes longer than the timeout, then retries', async () => {
    const hanging = (signal?: AbortSignal) => new Promise<FakeResponse>((_, reject) => signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const { http, signals, calls } = setup([() => hanging(signals[0]), () => Promise.resolve(ok({ query: {} }))]);

    await expect(http.query({ titles: 'Octopus' })).resolves.toEqual({ query: {} });
    expect(calls).toHaveLength(2);
  });

  it('does not retry client errors', async () => {
    const { http, calls } = setup([() => Promise.resolve(fail(404))]);

    await expect(http.rest('/page/summary/Nope')).rejects.toBeInstanceOf(WikiApiError);
    expect(calls).toHaveLength(1);
  });
});
