import pc from 'picocolors';
import { relative } from 'node:path';
import type { ProcessingResult } from '../core/types.js';

export const ui = {
  title(label: string) {
    console.log();
    console.log(pc.bold(pc.cyan(`  ${label}`)));
    console.log(pc.dim('  ' + '─'.repeat(label.length)));
  },
  info(label: string, value?: string) {
    const v = value ?? '';
    console.log(`  ${pc.dim(label.padEnd(12))}${v}`);
  },
  step(msg: string) {
    console.log(`  ${pc.cyan('›')} ${msg}`);
  },
  success(msg: string) {
    console.log(`  ${pc.green('✔')} ${msg}`);
  },
  warn(msg: string) {
    console.log(`  ${pc.yellow('!')} ${msg}`);
  },
  error(msg: string) {
    console.error(`  ${pc.red('✖')} ${msg}`);
  },
  blank() {
    console.log();
  },
};

export function reportFile(cwd: string, result: ProcessingResult): void {
  const src = relative(cwd, result.source) || result.source;
  if (result.skipped) {
    ui.warn(`${pc.dim(src)}  ${pc.yellow(`(${result.skipped})`)}`);
    return;
  }
  if (result.outputs.length === 0) {
    ui.warn(`${pc.dim(src)}  ${pc.yellow('(no output)')}`);
    return;
  }
  for (const out of result.outputs) {
    const rel = relative(cwd, out) || out;
    ui.success(`${pc.dim(src)} ${pc.dim('→')} ${pc.white(rel)}`);
  }
}

export function summarize(results: ProcessingResult[]): void {
  const ok = results.filter((r) => !r.skipped && r.outputs.length > 0);
  const skipped = results.filter((r) => r.skipped);
  const empty = results.filter((r) => !r.skipped && r.outputs.length === 0);
  const outputsCount = ok.reduce((n, r) => n + r.outputs.length, 0);

  ui.blank();
  ui.info('Processed', pc.bold(String(ok.length)));
  ui.info('Outputs', pc.bold(String(outputsCount)));
  if (skipped.length) ui.info('Errors', pc.red(String(skipped.length)));
  if (empty.length) ui.info('No-ops', pc.yellow(String(empty.length)));
}
