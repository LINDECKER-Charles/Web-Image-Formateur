import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  computeDisambiguators,
  runConvert,
  runResize,
  runResizeConvert,
} from '../../src/core/pipeline.js';

let dir: string;
let srcPng: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'imgc-pipeline-'));
  srcPng = join(dir, 'src.png');
  await sharp({ create: { width: 600, height: 300, channels: 3, background: '#000' } })
    .png()
    .toFile(srcPng);
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(
    () => {},
  );
});

describe('runConvert', () => {
  test('produces one output per input file', async () => {
    const results = await runConvert({ files: [srcPng], format: 'webp', quality: 80 });
    expect(results).toHaveLength(1);
    expect(results[0]!.outputs).toHaveLength(1);
    expect(results[0]!.skipped).toBeUndefined();
  });

  test('records skipped entries on error instead of throwing', async () => {
    const calls: string[] = [];
    const results = await runConvert({
      files: [join(dir, 'missing.png')],
      format: 'webp',
      quality: 80,
      onProgress: (r) => calls.push(r.skipped ?? 'ok'),
    });
    expect(results[0]!.skipped).toBeDefined();
    expect(results[0]!.outputs).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toBe('ok');
  });

  test('invokes onProgress for each file', async () => {
    const calls: string[] = [];
    await runConvert({
      files: [srcPng],
      format: 'webp',
      quality: 80,
      onProgress: (r) => calls.push(r.source),
    });
    expect(calls).toEqual([srcPng]);
  });
});

describe('runResize', () => {
  test('produces a variant per breakpoint below source width', async () => {
    const calls: string[] = [];
    const results = await runResize({
      files: [srcPng],
      breakpoints: [200, 400, 600, 800],
      quality: 80,
      onProgress: (r) => calls.push(r.source),
    });
    expect(results[0]!.outputs).toHaveLength(2);
    expect(calls).toEqual([srcPng]);
  });

  test('records skipped entries on error (non-throwing batch)', async () => {
    const calls: string[] = [];
    const results = await runResize({
      files: [join(dir, 'missing.png')],
      breakpoints: [320],
      quality: 80,
      onProgress: (r) => calls.push(r.skipped ?? 'ok'),
    });
    expect(results[0]!.skipped).toBeDefined();
    expect(results[0]!.outputs).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});

describe('computeDisambiguators', () => {
  test('returns undefined for every source when no collision', () => {
    const map = computeDisambiguators(['/x/hero.jpg', '/x/other.png'], 'webp');
    expect(map.get('/x/hero.jpg')).toBeUndefined();
    expect(map.get('/x/other.png')).toBeUndefined();
  });

  test('flags every colliding source with its extension', () => {
    const map = computeDisambiguators(['/x/hero.jpg', '/x/hero.png'], 'webp');
    expect(map.get('/x/hero.jpg')).toBe('jpg');
    expect(map.get('/x/hero.png')).toBe('png');
  });

  test('does not collide when keeping source extension (no format)', () => {
    const map = computeDisambiguators(['/x/hero.jpg', '/x/hero.png']);
    expect(map.get('/x/hero.jpg')).toBeUndefined();
    expect(map.get('/x/hero.png')).toBeUndefined();
  });

  test('scopes collisions per directory', () => {
    const map = computeDisambiguators(['/a/hero.jpg', '/b/hero.png'], 'webp');
    expect(map.get('/a/hero.jpg')).toBeUndefined();
    expect(map.get('/b/hero.png')).toBeUndefined();
  });
});

describe('batch collision behavior (regression)', () => {
  test('convert: same basename + different extensions produce distinct outputs', async () => {
    const collisionDir = join(dir, 'collide');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(collisionDir, { recursive: true });

    const jpgSrc = join(collisionDir, 'images.jpg');
    const pngSrc = join(collisionDir, 'images.png');
    await sharp({ create: { width: 100, height: 50, channels: 3, background: '#f00' } })
      .jpeg()
      .toFile(jpgSrc);
    await sharp({ create: { width: 100, height: 50, channels: 3, background: '#0f0' } })
      .png()
      .toFile(pngSrc);

    const results = await runConvert({
      files: [jpgSrc, pngSrc],
      format: 'webp',
      quality: 80,
    });

    expect(results).toHaveLength(2);
    const outputs = results.flatMap((r) => r.outputs);
    expect(new Set(outputs).size).toBe(2);
    expect(outputs.some((o) => o.endsWith('images.jpg.webp'))).toBe(true);
    expect(outputs.some((o) => o.endsWith('images.png.webp'))).toBe(true);
  });

  test('resize: same basename + different extensions + format produce distinct outputs', async () => {
    const collisionDir = join(dir, 'collide-resize');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(collisionDir, { recursive: true });

    const jpgSrc = join(collisionDir, 'hero.jpg');
    const pngSrc = join(collisionDir, 'hero.png');
    await sharp({ create: { width: 800, height: 400, channels: 3, background: '#f00' } })
      .jpeg()
      .toFile(jpgSrc);
    await sharp({ create: { width: 800, height: 400, channels: 3, background: '#0f0' } })
      .png()
      .toFile(pngSrc);

    const results = await runResizeConvert({
      files: [jpgSrc, pngSrc],
      format: 'webp',
      breakpoints: [400],
      quality: 80,
    });

    const outputs = results.flatMap((r) => r.outputs);
    expect(new Set(outputs).size).toBe(outputs.length);
    expect(outputs.some((o) => o.endsWith('400x200_hero.jpg.webp'))).toBe(true);
    expect(outputs.some((o) => o.endsWith('400x200_hero.png.webp'))).toBe(true);
  });
});

describe('runResizeConvert', () => {
  test('resize + re-encode in one pass, propagates onProgress', async () => {
    const calls: string[] = [];
    const results = await runResizeConvert({
      files: [srcPng],
      format: 'webp',
      breakpoints: [300],
      quality: 80,
      onProgress: (r) => calls.push(r.source),
    });
    expect(results[0]!.outputs).toHaveLength(1);
    expect(results[0]!.outputs[0]).toMatch(/\.webp$/);
    expect(calls).toEqual([srcPng]);
  });
});
