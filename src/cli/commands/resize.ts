import { Command } from 'commander';
import { cwd } from 'node:process';
import type { BuiltOptions } from '../options.js';
import { discoverImages } from '../../core/discover.js';
import { runResize } from '../../core/pipeline.js';
import { clampQuality, parseBreakpoints } from '../../utils/breakpoints.js';
import { reportFile, summarize, ui } from '../../ui/logger.js';
import { resolveInput } from '../helpers.js';

export function registerResize(program: Command, options: BuiltOptions): void {
  program
    .command('resize')
    .description('Generate responsive breakpoint variants (no format change).')
    .addOption(options.input)
    .addOption(options.recursive)
    .addOption(options.breakpoint)
    .addOption(options.quality)
    .action(async (opts: ResizeOpts) => {
      const breakpoints = parseBreakpoints(opts.breakpoint);
      const quality = clampQuality(Number(opts.quality));
      const input = await resolveInput(opts.input);
      const recursive = Boolean(opts.recursive);
      const files = await discoverImages({ input, recursive });

      ui.title('Resize');
      ui.info('Input', input);
      ui.info('Recursive', recursive ? 'yes' : 'no');
      ui.info('Breakpoints', breakpoints.join(', '));
      ui.info('Quality', String(quality));
      ui.info('Files', String(files.length));
      ui.blank();

      if (files.length === 0) {
        ui.warn('No images found.');
        return;
      }

      const results = await runResize({
        files,
        breakpoints,
        quality,
        onProgress: (r) => reportFile(cwd(), r),
      });
      summarize(results);
    });
}

interface ResizeOpts {
  input?: string;
  recursive?: boolean;
  breakpoint?: string;
  quality: number | string;
}
