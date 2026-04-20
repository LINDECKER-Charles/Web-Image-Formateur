import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  DEFAULT_BREAKPOINTS,
  DEFAULT_FORMAT,
  DEFAULT_QUALITY,
  SUPPORTED_OUTPUT_FORMATS,
} from './config.js';
import type { ImageFormat } from './types.js';
import { clampQuality, parseBreakpoints } from '../utils/breakpoints.js';
import { normalizeFormat } from '../utils/formats.js';

export type BreakpointPresets = Record<string, number[]>;

export interface UserSettings {
  format?: ImageFormat;
  quality?: number;
  /** Legacy single-list default (pre-preset config files). Still honored for back-compat. */
  breakpoints?: number[];
  /** Named lists of breakpoints, e.g. `{ "mobile": [320,640], "retina": [480,960,1440] }`. */
  presets?: BreakpointPresets;
  /** Name of the preset in `presets` used as the default breakpoint list. */
  defaultPreset?: string;
}

export interface ResolvedDefaults {
  format: ImageFormat;
  quality: number;
  breakpoints: number[];
  /** Name of the active default preset, if any. */
  activePreset?: string;
  source: {
    format: 'user' | 'builtin';
    quality: 'user' | 'builtin';
    breakpoints: 'user' | 'builtin';
  };
}

export const SETTINGS_KEYS = ['format', 'quality', 'breakpoints'] as const;
export type SettingKey = (typeof SETTINGS_KEYS)[number];

/** Max preset name length, kept reasonable to avoid absurd values. */
const PRESET_NAME_MAX = 64;
/** Allowed chars: letters, digits, dash, underscore, dot. */
const PRESET_NAME_RE = /^[a-zA-Z0-9._-]+$/;

/**
 * Cross-platform config location.
 * Honors `IMG_CONVERTOR_CONFIG_DIR` when set (useful for CI, sandboxed runs,
 * or users with non-standard home directories). Otherwise falls back to
 * `~/.img-convertor/config.json`.
 */
export function settingsPath(): string {
  const override = process.env.IMG_CONVERTOR_CONFIG_DIR;
  const base = override && override.trim() !== '' ? override : join(homedir(), '.img-convertor');
  return join(base, 'config.json');
}

export function loadSettings(): UserSettings {
  const file = settingsPath();
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<UserSettings>;
    return sanitize(raw);
  } catch {
    return {};
  }
}

export function saveSettings(next: UserSettings): void {
  const file = settingsPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf8');
}

export function resetSettings(): boolean {
  const file = settingsPath();
  if (!existsSync(file)) return false;
  rmSync(file, { force: true });
  return true;
}

export function resolveDefaults(settings: UserSettings = loadSettings()): ResolvedDefaults {
  const presetValues =
    settings.defaultPreset !== undefined ? settings.presets?.[settings.defaultPreset] : undefined;

  const breakpoints = presetValues ?? settings.breakpoints ?? [...DEFAULT_BREAKPOINTS];
  const hasUserBreakpoints = presetValues !== undefined || settings.breakpoints !== undefined;

  const resolved: ResolvedDefaults = {
    format: settings.format ?? DEFAULT_FORMAT,
    quality: settings.quality ?? DEFAULT_QUALITY,
    breakpoints,
    source: {
      format: settings.format !== undefined ? 'user' : 'builtin',
      quality: settings.quality !== undefined ? 'user' : 'builtin',
      breakpoints: hasUserBreakpoints ? 'user' : 'builtin',
    },
  };

  if (presetValues !== undefined && settings.defaultPreset !== undefined) {
    resolved.activePreset = settings.defaultPreset;
  }

  return resolved;
}

/** Coerce+validate a raw key/value pair coming from the CLI. */
export function coerceSetting(key: SettingKey, value: string): UserSettings {
  switch (key) {
    case 'format':
      return { format: normalizeFormat(value) };
    case 'quality':
      return { quality: clampQuality(Number(value)) };
    case 'breakpoints':
      return { breakpoints: parseBreakpoints(value) };
  }
}

export function mergeSettings(base: UserSettings, patch: UserSettings): UserSettings {
  return sanitize({ ...base, ...patch });
}

export function unsetSetting(base: UserSettings, key: SettingKey): UserSettings {
  const next: UserSettings = { ...base };
  delete next[key];
  return next;
}

// ──────────────────────────────────────────────────────────────────────────
// Preset helpers
// ──────────────────────────────────────────────────────────────────────────

/** Validate a preset name. Throws with a helpful message when invalid. */
export function assertPresetName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error('Preset name must not be empty.');
  if (trimmed.length > PRESET_NAME_MAX) {
    throw new Error(`Preset name too long (max ${PRESET_NAME_MAX} chars).`);
  }
  if (!PRESET_NAME_RE.test(trimmed)) {
    throw new Error('Preset name may only contain letters, digits, "." "-" "_".');
  }
  return trimmed;
}

export interface PresetEntry {
  name: string;
  values: number[];
  isDefault: boolean;
}

export function listPresets(settings: UserSettings = loadSettings()): PresetEntry[] {
  const presets = settings.presets ?? {};
  return Object.entries(presets)
    .map(([name, values]) => ({
      name,
      values: [...values],
      isDefault: settings.defaultPreset === name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getPreset(name: string, settings: UserSettings = loadSettings()): number[] | undefined {
  const values = settings.presets?.[name];
  return values ? [...values] : undefined;
}

/** Adds (or overwrites) a preset. Returns the updated settings object. */
export function addPreset(name: string, values: number[]): UserSettings {
  const cleanName = assertPresetName(name);
  const cleanValues = parseBreakpoints(values);
  const current = loadSettings();
  const next: UserSettings = {
    ...current,
    presets: { ...(current.presets ?? {}), [cleanName]: cleanValues },
  };
  saveSettings(next);
  return next;
}

/** Removes a preset. Clears `defaultPreset` if it pointed at the removed name. Returns true when something was removed. */
export function removePreset(name: string): boolean {
  const cleanName = assertPresetName(name);
  const current = loadSettings();
  if (!current.presets || !(cleanName in current.presets)) return false;

  const nextPresets = { ...current.presets };
  delete nextPresets[cleanName];

  const next: UserSettings = { ...current };
  if (Object.keys(nextPresets).length === 0) delete next.presets;
  else next.presets = nextPresets;

  if (next.defaultPreset === cleanName) delete next.defaultPreset;

  saveSettings(next);
  return true;
}

/** Sets the default preset by name. Pass `null` to clear the default. */
export function setDefaultPreset(name: string | null): UserSettings {
  const current = loadSettings();
  const next: UserSettings = { ...current };
  if (name === null) {
    delete next.defaultPreset;
  } else {
    const cleanName = assertPresetName(name);
    if (!current.presets || !(cleanName in current.presets)) {
      throw new Error(`No preset named "${cleanName}". Add it first with \`config preset add\`.`);
    }
    next.defaultPreset = cleanName;
  }
  saveSettings(next);
  return next;
}

function sanitize(raw: Partial<UserSettings>): UserSettings {
  const out: UserSettings = {};
  if (typeof raw.format === 'string' && (SUPPORTED_OUTPUT_FORMATS as readonly string[]).includes(raw.format)) {
    out.format = raw.format as ImageFormat;
  }
  if (typeof raw.quality === 'number' && raw.quality >= 0 && raw.quality <= 100) {
    out.quality = Math.round(raw.quality);
  }
  if (Array.isArray(raw.breakpoints)) {
    const bps = sanitizeBreakpointList(raw.breakpoints);
    if (bps.length) out.breakpoints = bps;
  }
  if (raw.presets && typeof raw.presets === 'object' && !Array.isArray(raw.presets)) {
    const presets: BreakpointPresets = {};
    for (const [name, values] of Object.entries(raw.presets)) {
      if (!PRESET_NAME_RE.test(name) || name.length > PRESET_NAME_MAX) continue;
      if (!Array.isArray(values)) continue;
      const cleaned = sanitizeBreakpointList(values);
      if (cleaned.length) presets[name] = cleaned;
    }
    if (Object.keys(presets).length) out.presets = presets;
  }
  if (typeof raw.defaultPreset === 'string' && out.presets && raw.defaultPreset in out.presets) {
    out.defaultPreset = raw.defaultPreset;
  }
  return out;
}

function sanitizeBreakpointList(values: unknown[]): number[] {
  const bps = values
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.round(n));
  return Array.from(new Set(bps)).sort((a, b) => a - b);
}
