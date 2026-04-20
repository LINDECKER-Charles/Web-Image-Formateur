import { cwd } from 'node:process';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import pc from 'picocolors';
import { SUPPORTED_OUTPUT_FORMATS } from '../core/config.js';
import { discoverImages } from '../core/discover.js';
import { runConvert, runResize, runResizeConvert } from '../core/pipeline.js';
import type { ImageFormat } from '../core/types.js';
import { clampQuality, parseBreakpoints } from '../utils/breakpoints.js';
import { reportFile, summarize, ui } from '../ui/logger.js';
import {
  addPreset,
  assertPresetName,
  getPreset,
  listPresets,
  loadSettings,
  removePreset,
  resolveDefaults,
  setDefaultPreset,
} from '../core/settings.js';

type Action = 'convert' | 'resize' | 'res-conv' | 'settings' | 'exit';

export async function runInteractive(): Promise<void> {
  printBanner();

  while (true) {
    const action = await select<Action>({
      message: 'What do you want to do?',
      choices: [
        { name: 'Convert — change image format', value: 'convert' },
        { name: 'Resize  — generate responsive breakpoints', value: 'resize' },
        { name: 'Res-Conv — resize and convert in one pass', value: 'res-conv' },
        { name: 'Settings — manage presets & defaults', value: 'settings' },
        { name: 'Exit', value: 'exit' },
      ],
    });

    if (action === 'exit') {
      ui.info('Bye', pc.dim('👋'));
      return;
    }

    try {
      if (action === 'convert') await flowConvert();
      else if (action === 'resize') await flowResize();
      else if (action === 'res-conv') await flowResConv();
      else if (action === 'settings') await flowSettings();
    } catch (err) {
      ui.error(err instanceof Error ? err.message : String(err));
    }

    ui.blank();
    const again = await confirm({ message: 'Back to menu?', default: true });
    if (!again) return;
  }
}

function printBanner(): void {
  console.log();
  console.log(pc.bold(pc.cyan('  img-convertor')));
  console.log(pc.dim('  Convert · Resize · Optimize — interactive console'));
  console.log(pc.dim('  ─────────────────────────────────────────────'));
}

async function askInput(): Promise<{ input: string; recursive: boolean }> {
  const chosen = await input({
    message: 'Input file or directory',
    default: cwd(),
    validate: async (v) => {
      if (!v.trim()) return 'Please provide a path.';
      try {
        await stat(resolve(v));
        return true;
      } catch {
        return 'Path does not exist.';
      }
    },
  });
  const target = resolve(chosen);
  const s = await stat(target);
  const recursive = s.isDirectory()
    ? await confirm({ message: 'Recurse into subdirectories?', default: false })
    : false;
  return { input: target, recursive };
}

async function askFormat(): Promise<ImageFormat> {
  const { format } = resolveDefaults();
  return (await select({
    message: 'Output format',
    default: format,
    choices: SUPPORTED_OUTPUT_FORMATS.map((f) => ({ name: f, value: f })),
  })) as ImageFormat;
}

async function askQuality(): Promise<number> {
  const { quality } = resolveDefaults();
  const raw = await input({
    message: 'Quality (0-100)',
    default: String(quality),
    validate: (v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) return 'Expected a number between 0 and 100.';
      return true;
    },
  });
  return clampQuality(Number(raw));
}

type BreakpointMode = 'default' | 'preset' | 'pick' | 'custom';

async function askBreakpoints(): Promise<number[]> {
  const { breakpoints: defaults, source, activePreset } = resolveDefaults();
  const presets = listPresets();

  const defaultLabel = activePreset
    ? `Use default preset "${activePreset}" (${defaults.join(', ')})`
    : source.breakpoints === 'user'
      ? `Use your saved defaults (${defaults.join(', ')})`
      : `Use built-in defaults (${defaults.join(', ')})`;

  const choices: Array<{ name: string; value: BreakpointMode; disabled?: string }> = [
    { name: defaultLabel, value: 'default' },
  ];
  if (presets.length > 0) {
    choices.push({ name: `Pick a saved preset (${presets.length} available)`, value: 'preset' });
  }
  choices.push(
    { name: 'Pick widths from the defaults', value: 'pick' },
    { name: 'Custom list', value: 'custom' },
  );

  const mode = await select<BreakpointMode>({
    message: 'Breakpoints',
    choices,
  });

  if (mode === 'default') return [...defaults];

  if (mode === 'preset') {
    const chosen = await select<string>({
      message: 'Select preset',
      choices: presets.map((p) => ({
        name: `${p.name}  ${pc.dim(`[${p.values.join(', ')}]`)}${p.isDefault ? pc.green(' (default)') : ''}`,
        value: p.name,
      })),
    });
    return getPreset(chosen) ?? [...defaults];
  }

  if (mode === 'pick') {
    const picked = await checkbox<number>({
      message: 'Select widths (space to toggle)',
      choices: defaults.map((bp) => ({ name: `${bp}px`, value: bp, checked: true })),
      required: true,
    });
    return parseBreakpoints(picked);
  }

  const raw = await input({
    message: 'Custom widths (comma-separated, e.g. 320,640,1024)',
    validate: (v) => {
      try {
        parseBreakpoints(v);
        return true;
      } catch (e) {
        return e instanceof Error ? e.message : 'Invalid list.';
      }
    },
  });
  const values = parseBreakpoints(raw);
  await maybeSaveAsPreset(values);
  return values;
}

async function maybeSaveAsPreset(values: number[]): Promise<void> {
  const save = await confirm({
    message: `Save [${values.join(', ')}] as a preset for reuse?`,
    default: false,
  });
  if (!save) return;

  const existing = new Set(Object.keys(loadSettings().presets ?? {}));
  const name = await input({
    message: 'Preset name',
    validate: (v) => {
      try {
        assertPresetName(v);
        return true;
      } catch (e) {
        return e instanceof Error ? e.message : 'Invalid name.';
      }
    },
  });
  const cleanName = assertPresetName(name);

  if (existing.has(cleanName)) {
    const overwrite = await confirm({
      message: `Preset "${cleanName}" already exists. Overwrite?`,
      default: false,
    });
    if (!overwrite) {
      ui.warn('Preset not saved.');
      return;
    }
  }

  addPreset(cleanName, values);
  ui.success(`Saved preset "${cleanName}".`);

  const makeDefault = await confirm({
    message: `Use "${cleanName}" as the default preset?`,
    default: false,
  });
  if (makeDefault) {
    setDefaultPreset(cleanName);
    ui.success(`Default preset = "${cleanName}".`);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Settings tab
// ──────────────────────────────────────────────────────────────────────────

type SettingsAction = 'list' | 'add' | 'remove' | 'use' | 'clear' | 'back';

async function flowSettings(): Promise<void> {
  while (true) {
    const presets = listPresets();
    const resolved = resolveDefaults();

    ui.title('Settings');
    ui.info('Format', `${resolved.format} ${resolved.source.format === 'user' ? pc.green('(user)') : pc.dim('(default)')}`);
    ui.info('Quality', String(resolved.quality));
    ui.info(
      'Breakpoints',
      resolved.activePreset
        ? `${resolved.breakpoints.join(', ')} ${pc.dim(`(preset: ${resolved.activePreset})`)}`
        : `${resolved.breakpoints.join(', ')} ${resolved.source.breakpoints === 'user' ? pc.green('(user)') : pc.dim('(default)')}`,
    );
    ui.info('Presets', String(presets.length));
    ui.blank();

    const action = await select<SettingsAction>({
      message: 'Settings',
      choices: [
        { name: 'List presets', value: 'list' },
        { name: 'Add a new preset', value: 'add' },
        { name: 'Remove a preset', value: 'remove', disabled: presets.length === 0 ? '(none)' : false },
        { name: 'Set default preset', value: 'use', disabled: presets.length === 0 ? '(none)' : false },
        { name: 'Clear default preset', value: 'clear', disabled: !resolved.activePreset ? '(no default)' : false },
        { name: 'Back', value: 'back' },
      ],
    });

    if (action === 'back') return;
    if (action === 'list') showPresets(presets);
    else if (action === 'add') await addPresetFlow();
    else if (action === 'remove') await removePresetFlow(presets);
    else if (action === 'use') await useDefaultFlow(presets);
    else if (action === 'clear') {
      setDefaultPreset(null);
      ui.success('Cleared default preset.');
    }

    ui.blank();
  }
}

function showPresets(presets: ReturnType<typeof listPresets>): void {
  if (!presets.length) {
    ui.warn('No presets yet.');
    return;
  }
  ui.blank();
  for (const p of presets) {
    const marker = p.isDefault ? pc.green('●') : pc.dim('○');
    const tag = p.isDefault ? pc.green(' (default)') : '';
    console.log(`    ${marker} ${pc.bold(p.name)}${tag} ${pc.dim(`[${p.values.join(', ')}]`)}`);
  }
}

async function addPresetFlow(): Promise<void> {
  const name = await input({
    message: 'Preset name',
    validate: (v) => {
      try {
        assertPresetName(v);
        return true;
      } catch (e) {
        return e instanceof Error ? e.message : 'Invalid name.';
      }
    },
  });
  const cleanName = assertPresetName(name);

  const existing = new Set(Object.keys(loadSettings().presets ?? {}));
  if (existing.has(cleanName)) {
    const overwrite = await confirm({
      message: `Preset "${cleanName}" already exists. Overwrite?`,
      default: false,
    });
    if (!overwrite) {
      ui.warn('Aborted.');
      return;
    }
  }

  const raw = await input({
    message: 'Widths (comma-separated, e.g. 320,640,1024)',
    validate: (v) => {
      try {
        parseBreakpoints(v);
        return true;
      } catch (e) {
        return e instanceof Error ? e.message : 'Invalid list.';
      }
    },
  });
  const values = parseBreakpoints(raw);
  addPreset(cleanName, values);
  ui.success(`Saved preset "${cleanName}" → [${values.join(', ')}].`);

  const makeDefault = await confirm({
    message: `Use "${cleanName}" as the default preset?`,
    default: false,
  });
  if (makeDefault) {
    setDefaultPreset(cleanName);
    ui.success(`Default preset = "${cleanName}".`);
  }
}

async function removePresetFlow(presets: ReturnType<typeof listPresets>): Promise<void> {
  const name = await select<string>({
    message: 'Which preset do you want to remove?',
    choices: presets.map((p) => ({
      name: `${p.name}  ${pc.dim(`[${p.values.join(', ')}]`)}${p.isDefault ? pc.green(' (default)') : ''}`,
      value: p.name,
    })),
  });
  const sure = await confirm({ message: `Remove "${name}"?`, default: false });
  if (!sure) {
    ui.warn('Aborted.');
    return;
  }
  removePreset(name);
  ui.success(`Removed "${name}".`);
}

async function useDefaultFlow(presets: ReturnType<typeof listPresets>): Promise<void> {
  const name = await select<string>({
    message: 'Pick the default preset',
    choices: presets.map((p) => ({
      name: `${p.name}  ${pc.dim(`[${p.values.join(', ')}]`)}${p.isDefault ? pc.green(' (default)') : ''}`,
      value: p.name,
    })),
  });
  setDefaultPreset(name);
  ui.success(`Default preset = "${name}".`);
}

// ──────────────────────────────────────────────────────────────────────────
// Operation flows
// ──────────────────────────────────────────────────────────────────────────

async function flowConvert(): Promise<void> {
  const { input: path, recursive } = await askInput();
  const format = await askFormat();
  const quality = await askQuality();
  const files = await discoverImages({ input: path, recursive });

  ui.title('Convert');
  ui.info('Files', String(files.length));
  ui.blank();
  if (files.length === 0) return ui.warn('No images found.');

  const results = await runConvert({
    files,
    format,
    quality,
    onProgress: (r) => reportFile(cwd(), r),
  });
  summarize(results);
}

async function flowResize(): Promise<void> {
  const { input: path, recursive } = await askInput();
  const breakpoints = await askBreakpoints();
  const quality = await askQuality();
  const files = await discoverImages({ input: path, recursive });

  ui.title('Resize');
  ui.info('Breakpoints', breakpoints.join(', '));
  ui.info('Files', String(files.length));
  ui.blank();
  if (files.length === 0) return ui.warn('No images found.');

  const results = await runResize({
    files,
    breakpoints,
    quality,
    onProgress: (r) => reportFile(cwd(), r),
  });
  summarize(results);
}

async function flowResConv(): Promise<void> {
  const { input: path, recursive } = await askInput();
  const format = await askFormat();
  const breakpoints = await askBreakpoints();
  const quality = await askQuality();
  const files = await discoverImages({ input: path, recursive });

  ui.title('Resize + Convert');
  ui.info('Format', format);
  ui.info('Breakpoints', breakpoints.join(', '));
  ui.info('Files', String(files.length));
  ui.blank();
  if (files.length === 0) return ui.warn('No images found.');

  const results = await runResizeConvert({
    files,
    format,
    breakpoints,
    quality,
    onProgress: (r) => reportFile(cwd(), r),
  });
  summarize(results);
}
