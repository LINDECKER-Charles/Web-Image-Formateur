import { convertFile } from './converter.js';
import { resizeFile } from './resizer.js';
import type { ImageFormat, ProcessingResult } from './types.js';

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
  const results: ProcessingResult[] = [];
  for (const source of opts.files) {
    try {
      const dest = await convertFile({ source, format: opts.format, quality: opts.quality });
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
  const results: ProcessingResult[] = [];
  for (const source of opts.files) {
    try {
      const { outputs } = await resizeFile({
        source,
        breakpoints: opts.breakpoints,
        quality: opts.quality,
        format: opts.format,
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

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : /* v8 ignore next -- defensive: sharp always throws Error */ String(err);
}
