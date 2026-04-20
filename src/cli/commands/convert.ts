import { Command } from 'commander';
import { cwd } from 'node:process';
import type { BuiltOptions } from '../options.js';
import { discoverImages } from '../../core/discover.js';
import { runConvert } from '../../core/pipeline.js';
import { clampQuality } from '../../utils/breakpoints.js';
import { normalizeFormat } from '../../utils/formats.js';
import { reportFile, summarize, ui } from '../../ui/logger.js';
import { resolveInput } from '../helpers.js';

export function registerConvert(program: Command, options: BuiltOptions): void {
  program
    .command('convert')
    .description('Convert images to another format, preserving dimensions.')
    .addOption(options.input)
    .addOption(options.recursive)
    .addOption(options.format)
    .addOption(options.quality)
    .action(async (opts: ConvertOpts) => {
      const format = normalizeFormat(opts.format);
      const quality = clampQuality(Number(opts.quality));
      const input = await resolveInput(opts.input);
      const recursive = Boolean(opts.recursive);
      const files = await discoverImages({ input, recursive });

      ui.title('Convert');
      ui.info('Input', input);
      ui.info('Recursive', recursive ? 'yes' : 'no');
      ui.info('Format', format);
      ui.info('Quality', String(quality));
      ui.info('Files', String(files.length));
      ui.blank();

      if (files.length === 0) {
        ui.warn('No images found.');
        return;
      }

      const results = await runConvert({
        files,
        format,
        quality,
        onProgress: (r) => reportFile(cwd(), r),
      });
      summarize(results);
    });
}

interface ConvertOpts {
  input?: string;
  recursive?: boolean;
  format: string;
  quality: number | string;
}
