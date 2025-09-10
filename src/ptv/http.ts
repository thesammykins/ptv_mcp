import { config } from '../config';
import { buildSignedPath } from './signing';

export interface HttpError extends Error {
  code: string;
  status?: number;
  path?: string;
  retryAfter?: number;
  cause?: unknown;
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function parseRetryAfter(h: string | null): number | undefined {
  if (!h) return undefined;
  const n = Number(h);
  if (!Number.isNaN(n)) return n * 1000;
  const d = Date.parse(h);
  if (!Number.isNaN(d)) return Math.max(0, d - Date.now());
  return undefined;
}

export async function ptvFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<T> {
  const base = config.ptvBaseUrl;
  const { pathWithQuery, signature } = buildSignedPath(path, params, config.ptvDevId, config.ptvApiKey);
  const url = `${base}${pathWithQuery}&signature=${signature}`;

  const maxRetries = config.httpMaxRetries;
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.httpTimeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const retryAfter = parseRetryAfter(res.headers.get('Retry-After'));
        if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
          attempt++;
          const baseDelay = Math.min(1000 * 2 ** attempt, 8000);
          const jitter = Math.floor(Math.random() * 250);
          const delay = retryAfter ?? baseDelay + jitter;
          await sleep(delay);
          continue;
        }
        const err: HttpError = Object.assign(new Error(`HTTP ${res.status}`), {
          code: 'PTV_HTTP_ERROR',
          status: res.status,
          path,
        });
        throw err;
      }
      return (await res.json()) as T;
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.name === 'AbortError') {
        if (attempt < maxRetries) {
          attempt++;
          const delay = Math.min(1000 * 2 ** attempt, 8000) + Math.floor(Math.random() * 250);
          await sleep(delay);
          continue;
        }
        const err: HttpError = Object.assign(new Error('Request timeout'), {
          code: 'PTV_TIMEOUT',
          path,
        });
        throw err;
      }
      throw e;
    }
  }
}
