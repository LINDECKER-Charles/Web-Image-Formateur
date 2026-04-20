import { dirname, join, parse } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import type { ImageFormat } from './types.js';
import { extensionFor, sharpFormat } from '../utils/formats.js';

export interface ConvertFileParams {
  source: string;
  format: ImageFormat;
  quality: number;
  /** Optional explicit destination path; otherwise derived from source. */
  destination?: string;
  /** Optional infix (e.g. source extension) to disambiguate colliding outputs. */
  disambiguator?: string;
}

/**
 * Convert a single file into the target format. Returns the written path.
 */
export async function convertFile({
  source,
  format,
  quality,
  destination,
  disambiguator,
}: ConvertFileParams): Promise<string> {
  const dest = destination ?? defaultDestination(source, format, disambiguator);
  await pipeline(sharp(source, { failOn: 'none' }), format, quality).toFile(dest);
  return dest;
}

/**
 * Apply format + quality onto a preconfigured Sharp pipeline.
 * Keeps format-specific encoder options in a single place.
 */
export function pipeline(img: Sharp, format: ImageFormat, quality: number): Sharp {
  const fmt = sharpFormat(format);
  switch (fmt) {
    case 'webp':
      return img.webp({ quality, effort: 4 });
    case 'jpeg':
      return img.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true });
    case 'png':
      return img.png({ quality, compressionLevel: 9 });
    case 'avif':
      return img.avif({ quality });
  }
}

export function defaultDestination(
  source: string,
  format: ImageFormat,
  disambiguator?: string,
): string {
  const { dir, name } = parse(source);
  const infix = disambiguator ? `.${disambiguator}` : '';
  return join(dir || '.', `${name}${infix}.${extensionFor(format)}`);
}

export function resizedDestination(
  source: string,
  width: number,
  height: number,
  format: ImageFormat | undefined,
  disambiguator?: string,
): string {
  const { dir, name, ext } = parse(source);
  const targetExt = format ? `.${extensionFor(format)}` : ext;
  const infix = disambiguator ? `.${disambiguator}` : '';
  return join(dir || dirname(source), `${width}x${height}_${name}${infix}${targetExt}`);
}
