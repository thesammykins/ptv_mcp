import crypto from 'crypto';

// Build a canonical query string with stable ordering.
function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    qp.append(k, String(v));
  }
  // URLSearchParams preserves insertion order; sort for determinism
  const entries = Array.from(qp.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const sorted = new URLSearchParams(entries as any);
  const s = sorted.toString();
  return s ? `?${s}` : '';
}

export function signPath(pathWithQuery: string, apiKey: string): string {
  // HMAC-SHA1 lower-case hex of the path + query (including devid) using API key
  const hmac = crypto.createHmac('sha1', apiKey);
  hmac.update(pathWithQuery, 'utf8');
  return hmac.digest('hex');
}

export function buildSignedPath(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  devid: string,
  apiKey: string
): { pathWithQuery: string; signature: string } {
  const query = buildQuery({ ...params, devid });
  const pathWithQuery = `${path}${query}`;
  const signature = signPath(pathWithQuery, apiKey);
  return { pathWithQuery, signature };
}
