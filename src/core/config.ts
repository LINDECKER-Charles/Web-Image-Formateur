import type { ImageFormat } from './types.js';

export const SUPPORTED_INPUT_EXTENSIONS = new Set<string>([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.tif',
  '.tiff',
  '.gif',
  '.svg',
]);

export const SUPPORTED_OUTPUT_FORMATS: readonly ImageFormat[] = [
  'webp',
  'jpeg',
  'jpg',
  'png',
  'avif',
];

export const DEFAULT_FORMAT: ImageFormat = 'webp';

export const DEFAULT_QUALITY = 85;

export const DEFAULT_BREAKPOINTS: readonly number[] = [
  24, 40, 80, 160, 320, 640, 768, 1024, 1280, 1536,
];
