import { Option } from 'commander';
import { SUPPORTED_OUTPUT_FORMATS } from '../core/config.js';
import type { ResolvedDefaults } from '../core/settings.js';

export function buildOptions(defaults: ResolvedDefaults) {
  return {
    input: new Option(
      '--input <path>',
      'File or directory to process. Defaults to the current working directory.',
    ),
    recursive: new Option(
      '-r, --recursive',
      'Recurse into subdirectories when --input is a directory.',
    ),
    format: new Option('--format <format>', 'Output image format.')
      .choices([...SUPPORTED_OUTPUT_FORMATS])
      .default(defaults.format, labelDefault(defaults.format, defaults.source.format)),
    quality: new Option('--quality <0-100>', 'Encoder quality from 0 to 100.')
      .argParser((v) => Number(v))
      .default(defaults.quality, labelDefault(String(defaults.quality), defaults.source.quality)),
    breakpoint: new Option(
      '--breakpoint <list>',
      'Comma-separated pixel widths, e.g. "320,640,1024". Overrides defaults.',
    ).default(
      defaults.breakpoints.join(','),
      labelDefault(defaults.breakpoints.join(','), defaults.source.breakpoints),
    ),
  };
}

export type BuiltOptions = ReturnType<typeof buildOptions>;

function labelDefault(value: string, source: 'user' | 'builtin'): string {
  return source === 'user' ? `${value} (user config)` : value;
}
