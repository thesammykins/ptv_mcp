/*
  Direction Normalization Tests
  
  Tests the normalizeDirection utility function to ensure it safely handles
  various input types without throwing TypeError on undefined/null direction parameters.
  
  Covers edge cases:
  - null/undefined input
  - empty string input  
  - numeric input
  - mixed case string input
  - invalid object/array input
*/

import { describe, it, expect } from 'bun:test';
import { normalizeDirection } from '../src/utils/normalize-direction';

describe('Direction Normalization Utility', () => {
  it('should return undefined for null input', () => {
    expect(normalizeDirection(null)).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(normalizeDirection(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(normalizeDirection('')).toBeUndefined();
  });

  it('should return undefined for whitespace-only string', () => {
    expect(normalizeDirection('   ')).toBeUndefined();
  });

  it('should normalize mixed case string to lowercase', () => {
    expect(normalizeDirection('Inbound')).toBe('inbound');
    expect(normalizeDirection('OUTBOUND')).toBe('outbound');
    expect(normalizeDirection('City')).toBe('city');
  });

  it('should trim and normalize string input', () => {
    expect(normalizeDirection('  Up  ')).toBe('up');
    expect(normalizeDirection('\tDown\n')).toBe('down');
  });

  it('should convert numbers to lowercase strings', () => {
    expect(normalizeDirection(0)).toBe('0');
    expect(normalizeDirection(1)).toBe('1');
    expect(normalizeDirection(123)).toBe('123');
  });

  it('should return undefined for invalid object input', () => {
    expect(normalizeDirection({})).toBeUndefined();
    expect(normalizeDirection({ direction: 'up' })).toBeUndefined();
    expect(normalizeDirection([])).toBeUndefined();
    expect(normalizeDirection([1, 2, 3])).toBeUndefined();
  });

  it('should return undefined for boolean input', () => {
    expect(normalizeDirection(true)).toBeUndefined();
    expect(normalizeDirection(false)).toBeUndefined();
  });

  it('should handle function input without error', () => {
    expect(normalizeDirection(() => 'test')).toBeUndefined();
  });
});