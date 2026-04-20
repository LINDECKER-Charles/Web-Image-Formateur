import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { discoverImages } from '../../src/core/discover.js';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'imgc-discover-'));
  await writeFile(join(dir, 'a.png'), '');
  await writeFile(join(dir, 'b.webp'), '');
  await writeFile(join(dir, 'c.txt'), '');
  await writeFile(join(dir, 'd.JPG'), '');
  await mkdir(join(dir, 'sub'));
  await writeFile(join(dir, 'sub', 'nested.jpeg'), '');
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(
    () => {},
  );
});

describe('discoverImages', () => {
  test('non-recursive: walks only the top level', async () => {
    const files = (await discoverImages({ input: dir, recursive: false })).map((f) => basename(f));
    expect(files.sort()).toEqual(['a.png', 'b.webp', 'd.JPG']);
  });

  test('recursive: includes nested files', async () => {
    const files = (await discoverImages({ input: dir, recursive: true })).map((f) => basename(f));
    expect(files.sort()).toEqual(['a.png', 'b.webp', 'd.JPG', 'nested.jpeg']);
  });

  test('single image path returns a one-element list', async () => {
    const files = await discoverImages({ input: join(dir, 'a.png'), recursive: false });
    expect(files).toHaveLength(1);
    expect(basename(files[0]!)).toBe('a.png');
  });

  test('single non-image path returns an empty list', async () => {
    const files = await discoverImages({ input: join(dir, 'c.txt'), recursive: false });
    expect(files).toEqual([]);
  });

  test('case-insensitive extension matching', async () => {
    const files = await discoverImages({ input: join(dir, 'd.JPG'), recursive: false });
    expect(files).toHaveLength(1);
  });

  test('throws on missing path', async () => {
    await expect(
      discoverImages({ input: join(dir, 'does-not-exist'), recursive: false }),
    ).rejects.toThrow();
  });

  test.skipIf(process.platform === 'win32')(
    'throws when input is neither a file nor a directory (POSIX FIFO)',
    async () => {
      const { execSync } = await import('node:child_process');
      const fifo = join(dir, 'fifo-pipe');
      execSync(`mkfifo ${JSON.stringify(fifo)}`);
      await expect(discoverImages({ input: fifo, recursive: false })).rejects.toThrow(
        /neither file nor directory/,
      );
    },
  );
});
