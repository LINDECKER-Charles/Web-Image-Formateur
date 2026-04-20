import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import { resizeFile } from '../../src/core/resizer.js';

let dir: string;
let srcPng: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'imgc-resize-'));
  srcPng = join(dir, 'source.png');
  await sharp({ create: { width: 800, height: 400, channels: 3, background: '#123456' } })
    .png()
    .toFile(srcPng);
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(
    () => {},
  );
});

describe('resizeFile', () => {
  test('skips breakpoints greater-or-equal to source width (no upscale)', async () => {
    const { outputs } = await resizeFile({
      source: srcPng,
      breakpoints: [200, 400, 800, 1600],
      quality: 80,
    });
    expect(outputs).toHaveLength(2);
    const names = outputs.map((o) => basename(o));
    expect(names.every((n) => n.startsWith('200x') || n.startsWith('400x'))).toBe(true);
  });

  test('preserves aspect ratio', async () => {
    const { outputs } = await resizeFile({
      source: srcPng,
      breakpoints: [400],
      quality: 80,
    });
    const meta = await sharp(outputs[0]!).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(200);
  });

  test('re-encodes variants into target format when provided', async () => {
    const { outputs } = await resizeFile({
      source: srcPng,
      breakpoints: [400],
      quality: 80,
      format: 'webp',
    });
    expect(outputs[0]).toMatch(/\.webp$/);
    const meta = await sharp(outputs[0]!).metadata();
    expect(meta.format).toBe('webp');
  });

  test('no breakpoint passes the upscale filter → empty outputs', async () => {
    const { outputs } = await resizeFile({
      source: srcPng,
      breakpoints: [1920, 2560],
      quality: 80,
    });
    expect(outputs).toEqual([]);
  });
});
