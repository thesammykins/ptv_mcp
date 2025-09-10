/*
  Tests TTL cache functionality including TTL expiration, memoization, and manual cache busting.
*/

import { describe, it, expect } from 'bun:test';
import { TTLCache } from '@/ptv/cache';

describe('TTL Cache', () => {
  it('should store and retrieve values', () => {
    const cache = new TTLCache<string>(1000); // 1 second TTL
    
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    const cache = new TTLCache<string>(1000);
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should expire values after TTL', async () => {
    const cache = new TTLCache<string>(50); // 50ms TTL
    
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should handle numeric and string keys', () => {
    const cache = new TTLCache<string>(1000);
    
    cache.set(123, 'numeric-key-value');
    cache.set('str', 'string-key-value');
    
    expect(cache.get(123)).toBe('numeric-key-value');
    expect(cache.get('str')).toBe('string-key-value');
  });

  it('should support manual deletion', () => {
    const cache = new TTLCache<string>(1000);
    
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
    
    cache.delete('key1');
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should support clear all', () => {
    const cache = new TTLCache<string>(1000);
    
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    
    cache.clear();
    
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  it('should handle different value types', () => {
    const cache = new TTLCache<{ id: number; name: string }>(1000);
    
    const value = { id: 1, name: 'test' };
    cache.set('obj', value);
    
    expect(cache.get('obj')).toEqual(value);
  });
});
