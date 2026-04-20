import type { ImageFormat } from '../core/types.js';
import { SUPPORTED_OUTPUT_FORMATS } from '../core/config.js';

export function normalizeFormat(input: string): ImageFormat {
  const v = input.trim().toLowerCase().replace(/^\./, '');
  if (!(SUPPORTED_OUTPUT_FORMATS as readonly string[]).includes(v)) {
    throw new Error(
      `Unsupported format "${input}". Supported: ${SUPPORTED_OUTPUT_FORMATS.join(', ')}`,
    );
  }
  return v as ImageFormat;
}

/** Extension (without leading dot) actually written to disk. */
export function extensionFor(format: ImageFormat): string {
  return format === 'jpg' ? 'jpeg' : format;
}

/** Sharp's canonical format name. */
export function sharpFormat(format: ImageFormat): 'webp' | 'jpeg' | 'png' | 'avif' {
  if (format === 'jpg') return 'jpeg';
  return format;
}
