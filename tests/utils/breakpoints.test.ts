import { describe, expect, test } from 'vitest';
import { clampQuality, parseBreakpoints } from '../../src/utils/breakpoints.js';
import { DEFAULT_BREAKPOINTS } from '../../src/core/config.js';

describe('parseBreakpoints', () => {
  test('returns built-in defaults when input is undefined', () => {
    expect(parseBreakpoints(undefined)).toEqual([...DEFAULT_BREAKPOINTS]);
  });

  test('parses comma-separated list', () => {
    expect(parseBreakpoints('320,640,1024')).toEqual([320, 640, 1024]);
  });

  test('parses whitespace-separated list', () => {
    expect(parseBreakpoints('320  640\t1024')).toEqual([320, 640, 1024]);
  });

  test('deduplicates and sorts', () => {
    expect(parseBreakpoints('640, 320, 320, 1024, 640')).toEqual([320, 640, 1024]);
  });

  test('rounds decimals and drops non-positive / NaN values', () => {
    expect(parseBreakpoints('320.4, -1, 0, abc, 640.7')).toEqual([320, 641]);
  });

  test('accepts a readonly number[]', () => {
    expect(parseBreakpoints([640, 320, 320])).toEqual([320, 640]);
  });

  test('throws on empty string', () => {
    expect(() => parseBreakpoints('')).toThrow(/No valid breakpoint/);
  });

  test('throws when all values are invalid', () => {
    expect(() => parseBreakpoints('-1, abc, 0')).toThrow(/No valid breakpoint/);
  });
});

describe('clampQuality', () => {
  test('accepts boundary and in-range values', () => {
    expect(clampQuality(0)).toBe(0);
    expect(clampQuality(85)).toBe(85);
    expect(clampQuality(100)).toBe(100);
  });

  test('rounds decimals', () => {
    expect(clampQuality(84.6)).toBe(85);
    expect(clampQuality(84.4)).toBe(84);
  });

  test('throws when out of range', () => {
    expect(() => clampQuality(-1)).toThrow(/out of range/);
    expect(() => clampQuality(101)).toThrow(/out of range/);
  });

  test('throws on non-finite input', () => {
    expect(() => clampQuality(Number.NaN)).toThrow(/Invalid quality/);
    expect(() => clampQuality(Infinity)).toThrow(/Invalid quality/);
  });
});
