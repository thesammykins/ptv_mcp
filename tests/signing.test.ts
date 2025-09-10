/*
  Tests HMAC-SHA1 signature generation against PTV documentation patterns.
  Verifies canonicalization, ordering, and signature format compliance.
*/

import { describe, it, expect } from 'bun:test';
import { signPath, buildSignedPath } from '@/ptv/signing';

describe('PTV API Signature Generation', () => {
  it('should generate HMAC-SHA1 signature from path and query', () => {
    // Test with simplified example (real values would come from PTV docs)
    const pathWithQuery = '/v3/departures/route_type/0/stop/1071?devid=3000176&max_results=3';
    const apiKey = 'test-key-for-hmac';
    
    const signature = signPath(pathWithQuery, apiKey);
    
    expect(signature).toMatch(/^[a-f0-9]{40}$/); // SHA1 produces 40 hex chars
    expect(signature).toBe(signature.toLowerCase()); // Should be lowercase
  });

  it('should build signed path with deterministic query ordering', () => {
    const path = '/v3/departures/route_type/0/stop/1071';
    const params = { max_results: 3, route_id: 5 };
    const devid = '3000176';
    const apiKey = 'test-key';

    const result = buildSignedPath(path, params, devid, apiKey);
    
    expect(result.pathWithQuery).toContain('devid=3000176');
    expect(result.pathWithQuery).toContain('max_results=3');
    expect(result.pathWithQuery).toContain('route_id=5');
    expect(result.signature).toMatch(/^[a-f0-9]{40}$/);
  });

  it('should handle empty params correctly', () => {
    const path = '/v3/routes';
    const params = {};
    const devid = '123';
    const apiKey = 'key';

    const result = buildSignedPath(path, params, devid, apiKey);
    
    expect(result.pathWithQuery).toBe('/v3/routes?devid=123');
  });

  it('should exclude undefined and null values from query', () => {
    const path = '/v3/search/test';
    const params = { 
      route_types: '0,1',
      latitude: undefined,
      longitude: null,
      radius: 500
    };
    const devid = '123';
    const apiKey = 'key';

    const result = buildSignedPath(path, params, devid, apiKey);
    
    expect(result.pathWithQuery).not.toContain('latitude');
    expect(result.pathWithQuery).not.toContain('longitude');
    expect(result.pathWithQuery).toContain('route_types=0%2C1');
    expect(result.pathWithQuery).toContain('radius=500');
  });

  it('should maintain deterministic ordering for consistent signatures', () => {
    const path = '/v3/test';
    const params1 = { b: 2, a: 1, c: 3 };
    const params2 = { c: 3, a: 1, b: 2 };
    const devid = '123';
    const apiKey = 'key';

    const result1 = buildSignedPath(path, params1, devid, apiKey);
    const result2 = buildSignedPath(path, params2, devid, apiKey);
    
    expect(result1.pathWithQuery).toBe(result2.pathWithQuery);
    expect(result1.signature).toBe(result2.signature);
  });
});
