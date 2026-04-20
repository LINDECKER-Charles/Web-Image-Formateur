import { describe, expect, test } from 'vitest';
import { extensionFor, normalizeFormat, sharpFormat } from '../../src/utils/formats.js';

describe('normalizeFormat', () => {
  test.each(['webp', 'WEBP', '.webp', 'WebP', '  webp  '])('accepts %p', (v) => {
    expect(normalizeFormat(v)).toBe('webp');
  });

  test('accepts every supported format', () => {
    expect(normalizeFormat('jpeg')).toBe('jpeg');
    expect(normalizeFormat('jpg')).toBe('jpg');
    expect(normalizeFormat('png')).toBe('png');
    expect(normalizeFormat('avif')).toBe('avif');
  });

  test('throws on unsupported format', () => {
    expect(() => normalizeFormat('gif')).toThrow(/Unsupported format/);
    expect(() => normalizeFormat('bmp')).toThrow(/Unsupported format/);
  });
});

describe('extensionFor', () => {
  test('maps jpg → jpeg', () => {
    expect(extensionFor('jpg')).toBe('jpeg');
  });

  test('returns format unchanged otherwise', () => {
    expect(extensionFor('webp')).toBe('webp');
    expect(extensionFor('png')).toBe('png');
    expect(extensionFor('avif')).toBe('avif');
    expect(extensionFor('jpeg')).toBe('jpeg');
  });
});

describe('sharpFormat', () => {
  test('canonicalizes jpg as jpeg', () => {
    expect(sharpFormat('jpg')).toBe('jpeg');
  });

  test('returns sharp-native name', () => {
    expect(sharpFormat('webp')).toBe('webp');
    expect(sharpFormat('avif')).toBe('avif');
    expect(sharpFormat('png')).toBe('png');
  });
});
