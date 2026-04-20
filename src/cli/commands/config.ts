import { Command } from 'commander';
import pc from 'picocolors';
import {
  addPreset,
  coerceSetting,
  listPresets,
  loadSettings,
  mergeSettings,
  removePreset,
  resetSettings,
  resolveDefaults,
  saveSettings,
  setDefaultPreset,
  SETTINGS_KEYS,
  settingsPath,
  unsetSetting,
  type SettingKey,
} from '../../core/settings.js';
import { parseBreakpoints } from '../../utils/breakpoints.js';
import { ui } from '../../ui/logger.js';

export function registerConfig(program: Command): void {
  const cfg = program
    .command('config')
    .description('Inspect or update persistent defaults (quality, breakpoints, format, presets).');

  cfg
    .command('list', { isDefault: true })
    .description('Show the current settings and their source.')
    .action(() => {
      const resolved = resolveDefaults();
      ui.title('Settings');
      ui.info('File', settingsPath());
      ui.info('Format', `${resolved.format} ${tag(resolved.source.format)}`);
      ui.info('Quality', `${resolved.quality} ${tag(resolved.source.quality)}`);
      const bpLabel = resolved.activePreset
        ? `${resolved.breakpoints.join(', ')} ${pc.dim(`(preset: ${resolved.activePreset})`)}`
        : `${resolved.breakpoints.join(', ')} ${tag(resolved.source.breakpoints)}`;
      ui.info('Breakpoints', bpLabel);

      const presets = listPresets();
      if (presets.length) {
        ui.blank();
        ui.info('Presets', `${presets.length}`);
        for (const p of presets) {
          const marker = p.isDefault ? pc.green('●') : pc.dim('○');
          console.log(`    ${marker} ${pc.bold(p.name)} ${pc.dim(`[${p.values.join(', ')}]`)}`);
        }
      }
    });

  cfg
    .command('get <key>')
    .description(`Print a single setting. Keys: ${SETTINGS_KEYS.join(', ')}.`)
    .action((key: string) => {
      const k = assertKey(key);
      const resolved = resolveDefaults();
      const value =
        k === 'format'
          ? resolved.format
          : k === 'quality'
            ? resolved.quality
            : resolved.breakpoints.join(',');
      console.log(value);
    });

  cfg
    .command('set <key> <value>')
    .description('Set a default. Value is validated and persisted.')
    .action((key: string, value: string) => {
      const k = assertKey(key);
      const patch = coerceSetting(k, value);
      const next = mergeSettings(loadSettings(), patch);
      saveSettings(next);
      ui.success(`${k} = ${renderValue(k, next)}`);
      ui.info('File', settingsPath());
    });

  cfg
    .command('unset <key>')
    .description('Remove a user override for a key (falls back to built-in default).')
    .action((key: string) => {
      const k = assertKey(key);
      const current = loadSettings();
      if (!(k in current)) {
        ui.warn(`No user override for "${k}".`);
        return;
      }
      saveSettings(unsetSetting(current, k));
      ui.success(`Unset ${k}.`);
    });

  cfg
    .command('reset')
    .description('Delete the settings file entirely.')
    .action(() => {
      const removed = resetSettings();
      if (removed) ui.success(`Removed ${settingsPath()}`);
      else ui.warn('No settings file to remove.');
    });

  cfg
    .command('path')
    .description('Print the settings file path.')
    .action(() => {
      console.log(settingsPath());
    });

  registerPresetSubcommands(cfg);
}

function registerPresetSubcommands(cfg: Command): void {
  const preset = cfg
    .command('preset')
    .description('Manage named breakpoint presets (list, add, remove, use).');

  preset
    .command('list', { isDefault: true })
    .description('List all saved presets and highlight the default.')
    .action(() => {
      const presets = listPresets();
      ui.title('Breakpoint presets');
      if (!presets.length) {
        ui.warn('No presets yet. Add one with `config preset add <name> <values>`.');
        return;
      }
      for (const p of presets) {
        const marker = p.isDefault ? pc.green('●') : pc.dim('○');
        const tag = p.isDefault ? pc.green(' (default)') : '';
        console.log(
          `  ${marker} ${pc.bold(p.name)}${tag} ${pc.dim(`[${p.values.join(', ')}]`)}`,
        );
      }
    });

  preset
    .command('add <name> <values>')
    .description('Add (or overwrite) a preset. Values are comma-separated widths.')
    .action((name: string, values: string) => {
      const parsed = parseBreakpoints(values);
      addPreset(name, parsed);
      ui.success(`Saved preset "${name}" → [${parsed.join(', ')}]`);
    });

  preset
    .command('remove <name>')
    .description('Remove a preset. Clears the default if it pointed to this preset.')
    .action((name: string) => {
      const removed = removePreset(name);
      if (removed) ui.success(`Removed preset "${name}".`);
      else ui.warn(`No preset named "${name}".`);
    });

  preset
    .command('use <name>')
    .description('Mark a preset as the default breakpoint list.')
    .action((name: string) => {
      setDefaultPreset(name);
      ui.success(`Default preset = "${name}".`);
    });

  preset
    .command('clear-default')
    .description('Clear the active default preset (falls back to legacy breakpoints or built-in).')
    .action(() => {
      setDefaultPreset(null);
      ui.success('Cleared default preset.');
    });
}

function assertKey(key: string): SettingKey {
  if (!(SETTINGS_KEYS as readonly string[]).includes(key)) {
    throw new Error(`Unknown setting "${key}". Valid keys: ${SETTINGS_KEYS.join(', ')}.`);
  }
  return key as SettingKey;
}

function renderValue(key: SettingKey, settings: ReturnType<typeof loadSettings>): string {
  if (key === 'breakpoints') return (settings.breakpoints ?? []).join(',');
  return String(settings[key] ?? '');
}

function tag(source: 'user' | 'builtin'): string {
  return source === 'user' ? pc.green('(user)') : pc.dim('(default)');
}
