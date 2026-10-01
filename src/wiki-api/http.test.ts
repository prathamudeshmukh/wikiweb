import { createWikiHttp, WikiApiError } from './http';

type FetchFn = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) });

// Responses are thunks so rejected promises are only created when the client actually makes the request.
function setup(responses: (() => ReturnType<FetchFn>)[]) {
  const calls: { url: string; headers?: Record<string, string> }[] = [];
  const delays: number[] = [];
  const queue = [...responses];
  const fetchFn: FetchFn = (url, init) => {
    calls.push({ url, headers: init?.headers });
    const next = queue.shift();
    if (!next) throw new Error('unexpected extra request');
    return next();
  };
  const http = createWikiHttp({
    fetchFn,
    userAgent: 'Tangent/test (contact@example.org)',
    sleep: async (ms) => {
      delays.push(ms);
    },
  });
  return { http, calls, delays };
}

describe('createWikiHttp', () => {
  it('sends action API params with the standard format flags and user agent', async () => {
    const { http, calls } = setup([() => Promise.resolve(ok({ query: {} }))]);

    await http.query({ titles: 'Octopus', prop: 'description' });

    const url = new URL(calls[0].url);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: 'query', format: 'json', formatversion: '2', origin: '*', titles: 'Octopus', prop: 'description',
    });
    expect(calls[0].headers).toEqual({ 'Api-User-Agent': 'Tangent/test (contact@example.org)' });
  });

  it('fetches REST paths under the REST base URL', async () => {
    const { http, calls } = setup([() => Promise.resolve(ok({ tfa: null }))]);

    const body = await http.rest('/feed/featured/2026/10/01');

    expect(calls[0].url).toBe('https://en.wikipedia.org/api/rest_v1/feed/featured/2026/10/01');
    expect(body).toEqual({ tfa: null });
  });

  it('retries server errors with exponential backoff, then succeeds', async () => {
    const { http, delays } = setup([() => Promise.resolve(fail(503)), () => Promise.resolve(fail(429)), () => Promise.resolve(ok({ query: {} }))]);

    await expect(http.query({ titles: 'Octopus' })).resolves.toEqual({ query: {} });
    expect(delays).toEqual([300, 600]);
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

  it('does not retry client errors', async () => {
    const { http, calls } = setup([() => Promise.resolve(fail(404))]);

    await expect(http.rest('/page/summary/Nope')).rejects.toBeInstanceOf(WikiApiError);
    expect(calls).toHaveLength(1);
  });
});
