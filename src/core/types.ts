export type ImageFormat = 'webp' | 'jpeg' | 'jpg' | 'png' | 'avif';

export interface ConvertOptions {
  format: ImageFormat;
  quality: number;
}

export interface ResizeOptions {
  breakpoints: number[];
  quality: number;
  format?: ImageFormat;
}

export interface ResConvOptions extends ResizeOptions {
  format: ImageFormat;
}

export interface DiscoverOptions {
  input: string;
  recursive: boolean;
}

export interface ProcessingResult {
  source: string;
  outputs: string[];
  skipped?: string;
}
