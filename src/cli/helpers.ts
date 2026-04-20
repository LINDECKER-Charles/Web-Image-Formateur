import { cwd } from 'node:process';
import { resolve } from 'node:path';
import { confirm } from '@inquirer/prompts';
import { ui } from '../ui/logger.js';

/**
 * If --input is omitted, the current working directory is used. We confirm
 * with the user before walking it (unless stdin is not a TTY, in which case
 * we assume a scripted run and proceed silently).
 */
export async function resolveInput(input: string | undefined): Promise<string> {
  if (input && input.trim() !== '') return resolve(input);

  const here = cwd();
  if (!process.stdin.isTTY) return here;

  ui.warn(`No --input provided. Default: ${here}`);
  const go = await confirm({ message: 'Process current directory?', default: true });
  if (!go) {
    ui.error('Aborted.');
    process.exit(1);
  }
  return here;
}
