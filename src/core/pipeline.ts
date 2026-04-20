import { parse } from 'node:path';
import { convertFile } from './converter.js';
import { resizeFile } from './resizer.js';
import type { ImageFormat, ProcessingResult } from './types.js';
import { extensionFor } from '../utils/formats.js';

export interface RunOptions {
  files: string[];
  format?: ImageFormat;
  quality: number;
  breakpoints?: number[];
  onProgress?: (result: ProcessingResult) => void;
}

/**
 * Batch convert: every file is re-encoded in `format`.
 */
export async function runConvert(opts: RunOptions & { format: ImageFormat }): Promise<ProcessingResult[]> {
  const disambiguators = computeDisambiguators(opts.files, opts.format);
  const results: ProcessingResult[] = [];
  for (const source of opts.files) {
    try {
      const dest = await convertFile({
        source,
        format: opts.format,
        quality: opts.quality,
        disambiguator: disambiguators.get(source),
      });
      const r: ProcessingResult = { source, outputs: [dest] };
      results.push(r);
      opts.onProgress?.(r);
    } catch (err) {
      const r: ProcessingResult = { source, outputs: [], skipped: messageOf(err) };
      results.push(r);
      opts.onProgress?.(r);
    }
  }
  return results;
}

/**
 * Batch resize: generates every breakpoint variant for each file.
 * If `format` is provided, variants are re-encoded into that format.
 */
export async function runResize(opts: RunOptions & { breakpoints: number[] }): Promise<ProcessingResult[]> {
  const disambiguators = computeDisambiguators(opts.files, opts.format);
  const results: ProcessingResult[] = [];
  for (const source of opts.files) {
    try {
      const { outputs } = await resizeFile({
        source,
        breakpoints: opts.breakpoints,
        quality: opts.quality,
        format: opts.format,
        disambiguator: disambiguators.get(source),
      });
      const r: ProcessingResult = { source, outputs };
      results.push(r);
      opts.onProgress?.(r);
    } catch (err) {
      const r: ProcessingResult = { source, outputs: [], skipped: messageOf(err) };
      results.push(r);
      opts.onProgress?.(r);
    }
  }
  return results;
}

/**
 * Combined workflow: resize to every breakpoint, each variant encoded in `format`.
 */
export async function runResizeConvert(
  opts: RunOptions & { format: ImageFormat; breakpoints: number[] },
): Promise<ProcessingResult[]> {
  return runResize({
    files: opts.files,
    breakpoints: opts.breakpoints,
    quality: opts.quality,
    format: opts.format,
    onProgress: opts.onProgress,
  });
}

/**
 * Detect in-batch output filename collisions and return a per-source infix
 * (the original extension without dot) to keep outputs unique.
 *
 * Sources that don't collide get `undefined` — clean names, unchanged.
 * Sources inside a colliding group get their original extension as infix
 * (e.g. `images.jpg` + `images.png` → `images.jpg.webp` + `images.png.webp`).
 */
export function computeDisambiguators(
  files: string[],
  format?: ImageFormat,
): Map<string, string | undefined> {
  const groups = new Map<string, string[]>();
  for (const source of files) {
    const { dir, name, ext } = parse(source);
    const outExt = format ? `.${extensionFor(format)}` : ext.toLowerCase();
    const key = `${dir}\u0000${name}\u0000${outExt}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(source);
    groups.set(key, bucket);
  }

  const result = new Map<string, string | undefined>();
  for (const sources of groups.values()) {
    if (sources.length === 1) {
      result.set(sources[0]!, undefined);
    } else {
      for (const s of sources) {
        const ext = parse(s).ext.toLowerCase().slice(1);
        result.set(s, ext);
      }
    }
  }
  return result;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : /* v8 ignore next -- defensive: sharp always throws Error */ String(err);
}
