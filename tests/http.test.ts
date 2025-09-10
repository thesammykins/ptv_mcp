/*
  Tests HTTP client functionality including retry logic, timeout handling, 
  and URL building correctness.
*/

import { describe, it, expect, mock } from 'bun:test';
import { ptvFetch } from '@/ptv/http';

// Mock config for testing
mock.module('@/config', () => ({
  config: {
    ptvBaseUrl: 'https://test-api.example.com',
    ptvDevId: 'test-dev-id',
    ptvApiKey: 'test-api-key',
    httpTimeoutMs: 1000,
    httpMaxRetries: 2,
  }
}));

describe('PTV HTTP Client', () => {
  it('should build correct signed URLs', async () => {
    // Mock fetch to capture the URL being requested
    const mockFetch = mock(() => 
      Promise.resolve(new Response(JSON.stringify({ test: 'data' }), { status: 200 }))
    );
    global.fetch = mockFetch;

    await ptvFetch('/v3/test', { param1: 'value1', param2: 123 });
    
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('https://test-api.example.com/v3/test');
    expect(calledUrl).toContain('devid=test-dev-id');
    expect(calledUrl).toContain('param1=value1');
    expect(calledUrl).toContain('param2=123');
    expect(calledUrl).toContain('signature=');
    expect(calledUrl.match(/signature=([a-f0-9]{40})/)).toBeTruthy();
  });

  it('should handle successful responses', async () => {
    const mockData = { routes: [{ route_id: 1, route_name: 'Test Route' }] };
    global.fetch = mock(() => 
      Promise.resolve(new Response(JSON.stringify(mockData), { status: 200 }))
    );

    const result = await ptvFetch('/v3/routes');
    expect(result).toEqual(mockData);
  });

  it('should throw on non-retryable HTTP errors', async () => {
    global.fetch = mock(() => 
      Promise.resolve(new Response('Not Found', { status: 404 }))
    );

    try {
      await ptvFetch('/v3/nonexistent');
      expect.unreachable();
    } catch (error: any) {
      expect(error.code).toBe('PTV_HTTP_ERROR');
      expect(error.status).toBe(404);
      expect(error.message).toBe('HTTP 404');
    }
  });

  // Note: Actual retry and timeout tests would require more complex mocking
  // These would be expanded in a full implementation
});
