import { Command } from 'commander';
import { cwd } from 'node:process';
import type { BuiltOptions } from '../options.js';
import { discoverImages } from '../../core/discover.js';
import { runResizeConvert } from '../../core/pipeline.js';
import { clampQuality, parseBreakpoints } from '../../utils/breakpoints.js';
import { normalizeFormat } from '../../utils/formats.js';
import { reportFile, summarize, ui } from '../../ui/logger.js';
import { resolveInput } from '../helpers.js';

export function registerResConv(program: Command, options: BuiltOptions): void {
  program
    .command('res-conv')
    .description('Resize to every breakpoint and re-encode each variant into a target format.')
    .addOption(options.input)
    .addOption(options.recursive)
    .addOption(options.format)
    .addOption(options.breakpoint)
    .addOption(options.quality)
    .action(async (opts: ResConvOpts) => {
      const format = normalizeFormat(opts.format);
      const breakpoints = parseBreakpoints(opts.breakpoint);
      const quality = clampQuality(Number(opts.quality));
      const input = await resolveInput(opts.input);
      const recursive = Boolean(opts.recursive);
      const files = await discoverImages({ input, recursive });

      ui.title('Resize + Convert');
      ui.info('Input', input);
      ui.info('Recursive', recursive ? 'yes' : 'no');
      ui.info('Format', format);
      ui.info('Breakpoints', breakpoints.join(', '));
      ui.info('Quality', String(quality));
      ui.info('Files', String(files.length));
      ui.blank();

      if (files.length === 0) {
        ui.warn('No images found.');
        return;
      }

      const results = await runResizeConvert({
        files,
        format,
        breakpoints,
        quality,
        onProgress: (r) => reportFile(cwd(), r),
      });
      summarize(results);
    });
}

interface ResConvOpts {
  input?: string;
  recursive?: boolean;
  format: string;
  breakpoint?: string;
  quality: number | string;
}
