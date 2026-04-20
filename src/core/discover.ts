import { readdir, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { SUPPORTED_INPUT_EXTENSIONS } from './config.js';

export interface DiscoverInput {
  input: string;
  recursive: boolean;
}

/**
 * Resolve a user-provided input into an ordered list of image files.
 * Accepts either a single file path or a directory (optionally recursive).
 */
export async function discoverImages({ input, recursive }: DiscoverInput): Promise<string[]> {
  const target = resolve(input);
  const s = await stat(target);

  if (s.isFile()) {
    return isImage(target) ? [target] : [];
  }

  /* v8 ignore next 3 -- guarded by a POSIX-only FIFO test; Windows coverage cannot create non-file/non-dir inodes */
  if (!s.isDirectory()) {
    throw new Error(`Input is neither file nor directory: ${target}`);
  }

  const out: string[] = [];
  await walk(target, recursive, out);
  return out.sort();
}

async function walk(dir: string, recursive: boolean, acc: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) await walk(full, recursive, acc);
      continue;
    }
    if (entry.isFile() && isImage(full)) acc.push(full);
  }
}

function isImage(file: string): boolean {
  return SUPPORTED_INPUT_EXTENSIONS.has(extname(file).toLowerCase());
}
