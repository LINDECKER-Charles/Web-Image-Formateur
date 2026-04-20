import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
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
