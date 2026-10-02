import { HTTP_RETRY, WIKI } from '../config/constants';
import { createLane, type Lane, type RequestBudget } from './requestBudget';

export interface WikiHttp {
  /** Action API (`api.php?action=query`) — standard format flags are added for you. */
  query(params: Readonly<Record<string, string>>): Promise<unknown>;
  /** REST API path, e.g. `/feed/featured/2026/10/01`. */
  rest(path: string): Promise<unknown>;
  /** REST API path returning a document rather than JSON, e.g. `/page/mobile-html/Ink`. */
  restText(path: string): Promise<string>;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text?(): Promise<string>;
  headers?: { get(name: string): string | null };
}

export type FetchFn = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<FetchResponse>;

export interface WikiHttpConfig {
  fetchFn: FetchFn;
  userAgent: string;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  /** Shared by every client so all requests together stay under Wikimedia's burst limit. Omit for unlimited (tests, scripts). */
  budget?: RequestBudget;
  /** Whose requests these are; defaults to on-screen. */
  lane?: Lane;
}

const UNLIMITED: RequestBudget = { acquire: async () => undefined };

export interface WikiApiErrorDetails {
  retryable: boolean;
  status?: number | null;
  /** Action API error code from an `{ error: { code } }` body, e.g. `missingtitle`. */
  code?: string | null;
  /** Server-requested wait before retrying (HTTP Retry-After), in ms. */
  retryAfterMs?: number | null;
}

export class WikiApiError extends Error {
  readonly retryable: boolean;
  readonly status: number | null;
  readonly code: string | null;
  readonly retryAfterMs: number | null;

  constructor(message: string, details: WikiApiErrorDetails) {
    super(message);
    this.name = 'WikiApiError';
    this.retryable = details.retryable;
    this.status = details.status ?? null;
    this.code = details.code ?? null;
    this.retryAfterMs = details.retryAfterMs ?? null;
  }
}

const MS_PER_SECOND = 1000;
const NETWORK_ERROR_MESSAGE = 'Could not reach Wikipedia. Check your connection.';
const STANDARD_PARAMS = { action: 'query', format: 'json', formatversion: '2', origin: '*' } as const;
const RETRYABLE_API_CODES: ReadonlySet<string> = new Set(HTTP_RETRY.retryableApiCodes);

const networkError = () => new WikiApiError(NETWORK_ERROR_MESSAGE, { retryable: true });
const isRetryableStatus = (status: number) => status === 429 || status >= 500;
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Retry-After in seconds (Wikimedia's form), capped; null when absent or not a number. */
function parseRetryAfter(response: FetchResponse): number | null {
  const header = response.headers?.get('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? Math.min(seconds * MS_PER_SECOND, HTTP_RETRY.maxRetryAfterMs) : null;
}

function httpError(response: FetchResponse): WikiApiError {
  if (typeof response.status !== 'number') return networkError();
  return new WikiApiError(`Wikipedia request failed (${response.status}).`, {
    retryable: isRetryableStatus(response.status),
    status: response.status,
    retryAfterMs: parseRetryAfter(response),
  });
}

/** The Action API reports most failures as HTTP 200 with `{ error: { code, info } }`. */
function apiError(body: unknown): WikiApiError | null {
  const error = (body as { error?: { code?: unknown; info?: unknown } } | null)?.error;
  if (!error || typeof error.code !== 'string') return null;
  const info = typeof error.info === 'string' ? error.info : error.code;
  return new WikiApiError(`Wikipedia: ${info}`, { retryable: RETRYABLE_API_CODES.has(error.code), code: error.code });
}

async function readJson(response: FetchResponse): Promise<unknown> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // An HTML error page or a truncated body — treat like a dropped connection.
    throw networkError();
  }
  const error = apiError(body);
  if (error) throw error;
  return body;
}

async function readText(response: FetchResponse): Promise<string> {
  try {
    if (!response.text) throw new Error('no text body');
    return await response.text();
  } catch {
    throw networkError();
  }
}

type BodyReader<T> = (response: FetchResponse) => Promise<T>;

export function createWikiHttp(config: WikiHttpConfig): WikiHttp {
  const { fetchFn, userAgent, sleep = defaultSleep, timeoutMs = HTTP_RETRY.timeoutMs, budget = UNLIMITED, lane = createLane('foreground') } = config;
  // Native apps can set the real User-Agent (Wikimedia policy); Api-User-Agent covers browser builds where it is locked.
  const headers = { 'User-Agent': userAgent, 'Api-User-Agent': userAgent };

  async function attempt<T>(url: string, read: BodyReader<T>): Promise<T> {
    await budget.acquire(lane);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(url, { headers, signal: controller.signal }).catch(() => {
        throw networkError();
      });
      if (!response.ok) throw httpError(response);
      return await read(response);
    } finally {
      clearTimeout(timer);
    }
  }

  async function get<T>(url: string, read: BodyReader<T>): Promise<T> {
    let lastError = networkError();
    for (let i = 0; i < HTTP_RETRY.attempts; i += 1) {
      try {
        return await attempt(url, read);
      } catch (error) {
        if (!(error instanceof WikiApiError) || !error.retryable) throw error;
        lastError = error;
      }
      if (i < HTTP_RETRY.attempts - 1) await sleep(lastError.retryAfterMs ?? HTTP_RETRY.baseDelayMs * 2 ** i);
    }
    throw lastError;
  }

  return {
    query(params) {
      const url = new URL(WIKI.actionApiUrl);
      Object.entries({ ...STANDARD_PARAMS, ...params }).forEach(([key, value]) => url.searchParams.set(key, value));
      return get(url.toString(), readJson);
    },
    rest(path) {
      return get(`${WIKI.restApiUrl}${path}`, readJson);
    },
    restText(path) {
      return get(`${WIKI.restApiUrl}${path}`, readText);
    },
  };
}
