import sharp from 'sharp';
import { pipeline, resizedDestination } from './converter.js';
import type { ImageFormat } from './types.js';

export interface ResizeFileParams {
  source: string;
  breakpoints: number[];
  quality: number;
  /** When set, re-encode each variant into this format. Otherwise preserve source encoding. */
  format?: ImageFormat;
  /** Optional infix inserted into every output filename to disambiguate colliding outputs. */
  disambiguator?: string;
}

export interface ResizeFileResult {
  outputs: string[];
}

/**
 * Resize a single file to every breakpoint smaller than the source width (no upscale).
 * Aspect ratio is preserved and height is computed from the source metadata.
 */
export async function resizeFile({
  source,
  breakpoints,
  quality,
  format,
  disambiguator,
}: ResizeFileParams): Promise<ResizeFileResult> {
  const base = sharp(source, { failOn: 'none' });
  const meta = await base.metadata();
  const srcWidth = meta.width;
  const srcHeight = meta.height;

  /* v8 ignore next 3 -- defensive: sharp with failOn:'none' returns dimensions for every valid image */
  if (!srcWidth || !srcHeight) {
    throw new Error(`Unable to read image dimensions: ${source}`);
  }

  const outputs: string[] = [];

  for (const bp of breakpoints) {
    if (bp >= srcWidth) continue;
    const height = Math.max(1, Math.round((srcHeight * bp) / srcWidth));
    const destination = resizedDestination(source, bp, height, format, disambiguator);

    let img = sharp(source, { failOn: 'none' }).resize({
      width: bp,
      height,
      fit: 'fill',
      kernel: 'lanczos3',
      withoutEnlargement: true,
    });

    if (format) {
      img = pipeline(img, format, quality);
    }

    await img.toFile(destination);
    outputs.push(destination);
  }

  return { outputs };
}
