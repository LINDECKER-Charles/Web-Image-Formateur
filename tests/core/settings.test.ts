import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  addPreset,
  assertPresetName,
  coerceSetting,
  getPreset,
  listPresets,
  loadSettings,
  mergeSettings,
  removePreset,
  resetSettings,
  resolveDefaults,
  saveSettings,
  setDefaultPreset,
  settingsPath,
  unsetSetting,
} from '../../src/core/settings.js';
import { DEFAULT_BREAKPOINTS, DEFAULT_FORMAT, DEFAULT_QUALITY } from '../../src/core/config.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'imgc-settings-'));
  process.env.IMG_CONVERTOR_CONFIG_DIR = dir;
});

afterEach(() => {
  delete process.env.IMG_CONVERTOR_CONFIG_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe('settingsPath', () => {
  test('honors IMG_CONVERTOR_CONFIG_DIR', () => {
    expect(settingsPath()).toBe(join(dir, 'config.json'));
  });

  test('falls back to ~/.img-convertor when env var is empty or missing', async () => {
    const { homedir } = await import('node:os');
    const expected = join(homedir(), '.img-convertor', 'config.json');

    delete process.env.IMG_CONVERTOR_CONFIG_DIR;
    expect(settingsPath()).toBe(expected);

    process.env.IMG_CONVERTOR_CONFIG_DIR = '   ';
    expect(settingsPath()).toBe(expected);
  });
});

describe('resolveDefaults', () => {
  test('falls back to built-ins when no config file exists', () => {
    const r = resolveDefaults();
    expect(r.format).toBe(DEFAULT_FORMAT);
    expect(r.quality).toBe(DEFAULT_QUALITY);
    expect(r.breakpoints).toEqual([...DEFAULT_BREAKPOINTS]);
    expect(r.source.format).toBe('builtin');
    expect(r.source.quality).toBe('builtin');
    expect(r.source.breakpoints).toBe('builtin');
  });

  test('prefers user values when present', () => {
    saveSettings({ quality: 72, breakpoints: [320, 640] });
    const r = resolveDefaults();
    expect(r.quality).toBe(72);
    expect(r.source.quality).toBe('user');
    expect(r.breakpoints).toEqual([320, 640]);
    expect(r.source.breakpoints).toBe('user');
    expect(r.source.format).toBe('builtin');
  });

  test('marks format as user when configured', () => {
    saveSettings({ format: 'avif' });
    const r = resolveDefaults();
    expect(r.format).toBe('avif');
    expect(r.source.format).toBe('user');
  });
});

describe('load / save / reset', () => {
  test('saveSettings writes valid JSON', () => {
    saveSettings({ quality: 90, breakpoints: [100, 200], format: 'avif' });
    const raw = JSON.parse(readFileSync(settingsPath(), 'utf8'));
    expect(raw).toEqual({ quality: 90, breakpoints: [100, 200], format: 'avif' });
  });

  test('loadSettings returns {} when file is absent', () => {
    expect(loadSettings()).toEqual({});
  });

  test('loadSettings is resilient to malformed JSON', () => {
    writeFileSync(settingsPath(), 'not-json');
    expect(loadSettings()).toEqual({});
  });

  test('loadSettings sanitizes out-of-range values', () => {
    writeFileSync(
      settingsPath(),
      JSON.stringify({ quality: 200, breakpoints: [-1, 'x', 320], format: 'gif' }),
    );
    const loaded = loadSettings();
    expect(loaded.quality).toBeUndefined();
    expect(loaded.format).toBeUndefined();
    expect(loaded.breakpoints).toEqual([320]);
  });

  test('resetSettings removes the file and returns true/false accordingly', () => {
    expect(resetSettings()).toBe(false);
    saveSettings({ quality: 50 });
    expect(existsSync(settingsPath())).toBe(true);
    expect(resetSettings()).toBe(true);
    expect(existsSync(settingsPath())).toBe(false);
  });
});

describe('coerceSetting', () => {
  test('validates quality', () => {
    expect(coerceSetting('quality', '80')).toEqual({ quality: 80 });
    expect(() => coerceSetting('quality', '200')).toThrow();
    expect(() => coerceSetting('quality', 'abc')).toThrow();
  });

  test('validates breakpoints', () => {
    expect(coerceSetting('breakpoints', '320,640')).toEqual({ breakpoints: [320, 640] });
    expect(() => coerceSetting('breakpoints', '')).toThrow();
  });

  test('validates format', () => {
    expect(coerceSetting('format', 'webp')).toEqual({ format: 'webp' });
    expect(() => coerceSetting('format', 'gif')).toThrow();
  });
});

describe('mergeSettings / unsetSetting', () => {
  test('merge overwrites prior values', () => {
    const a = { quality: 50, format: 'webp' as const };
    const b = mergeSettings(a, { quality: 80 });
    expect(b).toEqual({ quality: 80, format: 'webp' });
  });

  test('unset removes the key', () => {
    const a = { quality: 50, format: 'webp' as const };
    expect(unsetSetting(a, 'quality')).toEqual({ format: 'webp' });
  });
});

describe('presets', () => {
  test('listPresets returns an empty array when none are saved', () => {
    expect(listPresets()).toEqual([]);
  });

  test('addPreset writes sanitized values and listPresets returns them sorted', () => {
    addPreset('retina', [480, 960, 1440]);
    addPreset('mobile', [320, 640]);
    const presets = listPresets();
    expect(presets.map((p) => p.name)).toEqual(['mobile', 'retina']);
    expect(presets[0]!.values).toEqual([320, 640]);
    expect(presets.every((p) => !p.isDefault)).toBe(true);
  });

  test('addPreset overwrites when the name already exists', () => {
    addPreset('mobile', [320, 640]);
    addPreset('mobile', [360, 720]);
    expect(getPreset('mobile')).toEqual([360, 720]);
  });

  test('setDefaultPreset marks the preset as default in resolveDefaults', () => {
    addPreset('retina', [480, 960, 1440]);
    setDefaultPreset('retina');
    const r = resolveDefaults();
    expect(r.breakpoints).toEqual([480, 960, 1440]);
    expect(r.activePreset).toBe('retina');
    expect(r.source.breakpoints).toBe('user');
  });

  test('setDefaultPreset(null) clears the active preset', () => {
    addPreset('retina', [480, 960]);
    setDefaultPreset('retina');
    expect(resolveDefaults().activePreset).toBe('retina');
    setDefaultPreset(null);
    expect(resolveDefaults().activePreset).toBeUndefined();
    expect(resolveDefaults().source.breakpoints).toBe('builtin');
  });

  test('setDefaultPreset rejects unknown names', () => {
    expect(() => setDefaultPreset('ghost')).toThrow(/No preset named/);
  });

  test('removePreset returns true when removing, clears default if it matched', () => {
    addPreset('retina', [480, 960]);
    setDefaultPreset('retina');

    expect(removePreset('retina')).toBe(true);
    expect(getPreset('retina')).toBeUndefined();
    expect(resolveDefaults().activePreset).toBeUndefined();
  });

  test('removePreset returns false for unknown names', () => {
    expect(removePreset('ghost')).toBe(false);
  });

  test('removing the last preset drops the presets key entirely', () => {
    addPreset('solo', [320]);
    removePreset('solo');
    expect(loadSettings().presets).toBeUndefined();
  });

  test('removing one of several presets keeps the others', () => {
    addPreset('mobile', [320, 640]);
    addPreset('retina', [480, 960]);
    expect(removePreset('mobile')).toBe(true);
    const remaining = loadSettings().presets;
    expect(Object.keys(remaining ?? {})).toEqual(['retina']);
  });

  test('preset takes precedence over legacy `breakpoints` key', () => {
    saveSettings({ breakpoints: [100, 200] });
    addPreset('retina', [480, 960]);
    setDefaultPreset('retina');
    const r = resolveDefaults();
    expect(r.breakpoints).toEqual([480, 960]);
    expect(r.activePreset).toBe('retina');
  });

  test('loadSettings sanitizes bad preset names and invalid values', () => {
    writeFileSync(
      settingsPath(),
      JSON.stringify({
        presets: {
          mobile: [320, 640],
          'bad name!': [100, 200],
          broken: ['x', -1],
          nulled: null,
        },
        defaultPreset: 'mobile',
      }),
    );
    const loaded = loadSettings();
    expect(Object.keys(loaded.presets ?? {})).toEqual(['mobile']);
    expect(loaded.defaultPreset).toBe('mobile');
  });

  test('defaultPreset referring to a missing preset is dropped on load', () => {
    writeFileSync(
      settingsPath(),
      JSON.stringify({ presets: { mobile: [320, 640] }, defaultPreset: 'ghost' }),
    );
    expect(loadSettings().defaultPreset).toBeUndefined();
  });
});

describe('assertPresetName', () => {
  test('accepts letters, digits, ._-', () => {
    expect(assertPresetName('mobile_v2')).toBe('mobile_v2');
    expect(assertPresetName('  retina-3x  ')).toBe('retina-3x');
    expect(assertPresetName('v1.0')).toBe('v1.0');
  });

  test('rejects empty, too long, or forbidden chars', () => {
    expect(() => assertPresetName('')).toThrow(/empty/);
    expect(() => assertPresetName('   ')).toThrow(/empty/);
    expect(() => assertPresetName('bad name')).toThrow(/may only contain/);
    expect(() => assertPresetName('slash/name')).toThrow(/may only contain/);
    expect(() => assertPresetName('x'.repeat(65))).toThrow(/too long/);
  });
});
