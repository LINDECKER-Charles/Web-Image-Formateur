import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import {
  convertFile,
  defaultDestination,
  resizedDestination,
} from '../../src/core/converter.js';

let dir: string;
let srcPng: string;
let noisyPng: string;

function randomPixels(w: number, h: number, channels: 3 | 4): Buffer {
  const buf = Buffer.alloc(w * h * channels);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  return buf;
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'imgc-convert-'));
  srcPng = join(dir, 'source.png');
  noisyPng = join(dir, 'noisy.png');
  await sharp({
    create: {
      width: 200,
      height: 100,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toFile(srcPng);
  await sharp(randomPixels(256, 128, 3), {
    raw: { width: 256, height: 128, channels: 3 },
  })
    .png()
    .toFile(noisyPng);
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(
    () => {},
  );
});

describe('convertFile', () => {
  test('encodes the target format and preserves dimensions', async () => {
    const dest = await convertFile({ source: srcPng, format: 'webp', quality: 80 });
    expect(dest).toBe(defaultDestination(srcPng, 'webp'));

    const meta = await sharp(dest).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  test('respects an explicit destination path', async () => {
    const explicit = join(dir, 'out.jpeg');
    const dest = await convertFile({
      source: srcPng,
      format: 'jpeg',
      quality: 70,
      destination: explicit,
    });
    expect(dest).toBe(explicit);

    const meta = await sharp(explicit).metadata();
    expect(meta.format).toBe('jpeg');
  });

  test('encodes PNG output', async () => {
    const dest = join(dir, 'out.png');
    await convertFile({ source: srcPng, format: 'png', quality: 80, destination: dest });
    const meta = await sharp(dest).metadata();
    expect(meta.format).toBe('png');
  });

  test('encodes AVIF output', async () => {
    const dest = join(dir, 'out.avif');
    await convertFile({ source: noisyPng, format: 'avif', quality: 50, destination: dest });
    const meta = await sharp(dest).metadata();
    // Sharp reports AVIF metadata through the HEIF container on some builds.
    expect(['avif', 'heif']).toContain(meta.format);
  });

  test('flattens transparency for JPEG output', async () => {
    const rgba = join(dir, 'rgba.png');
    await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toFile(rgba);

    const dest = await convertFile({ source: rgba, format: 'jpeg', quality: 80 });
    const meta = await sharp(dest).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.hasAlpha).toBe(false);
  });

  test('higher quality produces a larger WEBP on noisy input', async () => {
    const { statSync } = await import('node:fs');
    await convertFile({
      source: noisyPng,
      format: 'webp',
      quality: 10,
      destination: join(dir, 'low.webp'),
    });
    await convertFile({
      source: noisyPng,
      format: 'webp',
      quality: 95,
      destination: join(dir, 'high.webp'),
    });
    const lo = statSync(join(dir, 'low.webp')).size;
    const hi = statSync(join(dir, 'high.webp')).size;
    expect(hi).toBeGreaterThan(lo);
  });
});

describe('destination helpers', () => {
  test('defaultDestination swaps extension', () => {
    expect(basename(defaultDestination('/x/y/foo.png', 'webp'))).toBe('foo.webp');
    expect(basename(defaultDestination('/x/y/foo.png', 'avif'))).toBe('foo.avif');
  });

  test('defaultDestination maps jpg → .jpeg', () => {
    expect(basename(defaultDestination('/x/y/foo.png', 'jpg'))).toBe('foo.jpeg');
  });

  test('resizedDestination prefixes WxH and preserves ext by default', () => {
    expect(basename(resizedDestination('/x/foo.png', 320, 200, undefined))).toBe('320x200_foo.png');
  });

  test('resizedDestination applies format extension when provided', () => {
    expect(basename(resizedDestination('/x/foo.png', 320, 200, 'webp'))).toBe('320x200_foo.webp');
  });

  test('defaultDestination falls back to "." for bare filenames', () => {
    expect(defaultDestination('foo.png', 'webp')).toBe(join('.', 'foo.webp'));
  });

  test('resizedDestination falls back to "." for bare filenames', () => {
    expect(resizedDestination('foo.png', 320, 200, 'webp')).toBe(
      join('.', '320x200_foo.webp'),
    );
  });
});
