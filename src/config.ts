/*
  Environment configuration and validation for PTV MCP.
  Secrets are provided via environment variables (never committed).
*/

export interface Config {
  ptvBaseUrl: string;
  ptvDevId: string;
  ptvApiKey: string;
  httpTimeoutMs: number;
  httpMaxRetries: number;
  cacheTtlHours: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const config: Config = {
  ptvBaseUrl: process.env.PTV_BASE_URL ?? 'https://timetableapi.ptv.vic.gov.au',
  ptvDevId: process.env.PTV_DEV_ID ?? '',
  ptvApiKey: process.env.PTV_API_KEY ?? '',
  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_MS ?? 8000),
  httpMaxRetries: Number(process.env.HTTP_MAX_RETRIES ?? 3),
  cacheTtlHours: Number(process.env.CACHE_TTL_HOURS ?? 12),
  logLevel: (process.env.LOG_LEVEL as Config['logLevel']) ?? 'info',
};

export function validateRequiredAuth(): void {
  requireEnv('PTV_DEV_ID');
  requireEnv('PTV_API_KEY');
}
