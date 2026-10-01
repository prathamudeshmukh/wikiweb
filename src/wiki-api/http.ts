import { HTTP_RETRY, WIKI } from '../config/constants';

export interface WikiHttp {
  /** Action API (`api.php?action=query`) — standard format flags are added for you. */
  query(params: Readonly<Record<string, string>>): Promise<unknown>;
  /** REST API path, e.g. `/feed/featured/2026/10/01`. */
  rest(path: string): Promise<unknown>;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchFn = (url: string, init: { headers: Record<string, string> }) => Promise<FetchResponse>;

export interface WikiHttpConfig {
  fetchFn: FetchFn;
  userAgent: string;
  sleep?: (ms: number) => Promise<void>;
}

export class WikiApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'WikiApiError';
  }
}

const STANDARD_PARAMS = { action: 'query', format: 'json', formatversion: '2', origin: '*' } as const;

const isRetryable = (status: number) => status === 429 || status >= 500;
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createWikiHttp({ fetchFn, userAgent, sleep = defaultSleep }: WikiHttpConfig): WikiHttp {
  const headers = { 'Api-User-Agent': userAgent };

  async function attempt(url: string): Promise<unknown> {
    let response: FetchResponse;
    try {
      response = await fetchFn(url, { headers });
    } catch {
      throw new WikiApiError('Could not reach Wikipedia. Check your connection.');
    }
    if (response.ok) return response.json();
    throw new WikiApiError(`Wikipedia request failed (${response.status}).`, response.status);
  }

  async function getJson(url: string): Promise<unknown> {
    let lastError = new WikiApiError('Wikipedia request failed.');
    for (let i = 0; i < HTTP_RETRY.attempts; i += 1) {
      try {
        return await attempt(url);
      } catch (error) {
        const apiError = error as WikiApiError;
        if (apiError.status !== null && !isRetryable(apiError.status)) throw apiError;
        lastError = apiError;
      }
      if (i < HTTP_RETRY.attempts - 1) await sleep(HTTP_RETRY.baseDelayMs * 2 ** i);
    }
    throw lastError;
  }

  return {
    query(params) {
      const url = new URL(WIKI.actionApiUrl);
      Object.entries({ ...STANDARD_PARAMS, ...params }).forEach(([key, value]) => url.searchParams.set(key, value));
      return getJson(url.toString());
    },
    rest(path) {
      return getJson(`${WIKI.restApiUrl}${path}`);
    },
  };
}
