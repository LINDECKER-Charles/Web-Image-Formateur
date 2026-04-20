# img-convertor

[![CI](https://img.shields.io/github/actions/workflow/status/LINDECKER-Charles/Web-Image-Formateur/ci.yml?branch=main&label=CI&logo=github)](https://github.com/LINDECKER-Charles/Web-Image-Formateur/actions/workflows/ci.yml)
[![tests](https://img.shields.io/badge/tests-80%20passed-brightgreen?logo=vitest&logoColor=white)](#testing)
[![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?logo=vitest&logoColor=white)](#testing)
[![node](https://img.shields.io/node/v/charles_lindecker/img-convertor)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/charles_lindecker/img-convertor.svg?logo=npm)](https://www.npmjs.com/package/charles_lindecker/img-convertor)
[![license](https://img.shields.io/github/license/LINDECKER-Charles/Web-Image-Formateur)](./LICENSE)

A fast image converter and responsive breakpoint resizer for the web.
Ships with a polished **CLI** *and* an **interactive console** — pick your flow.

```bash
npm i -g charles_lindecker/img-convertor
img-convertor res-conv --input ./assets -r --format webp --quality 80
```

---

## Quick start

```bash
# 1. Install globally
npm i -g charles_lindecker/img-convertor

# 2. Convert every image in the current folder to WEBP (recursive)
img-convertor convert -r --format webp

# 3. Or launch the guided interactive console
img-convertor
```

That's it. `img-convertor` writes the outputs next to each source file.

---

## Install

> Requires **Node.js ≥ 18.17**.

```bash
# Global CLI (recommended for day-to-day use)
npm i -g charles_lindecker/img-convertor

# Or as a project dev-dependency
npm i -D charles_lindecker/img-convertor

# Ad-hoc with npx (no install)
npx img-convertor --help
```

---

## Usage

The CLI exposes three commands plus a `config` command for persistent defaults.
Run **without arguments** at any time to open the interactive console.

```text
img-convertor <command> [options]

Commands
  convert      Convert images to another format.
  resize       Generate responsive breakpoint variants.
  res-conv     Resize + re-encode in a single pass.
  config       Inspect or update persistent defaults.
  interactive  Open the interactive console.
```

### 1. Convert — change image format

Re-encodes every source image into a target format, preserving dimensions.

```bash
# Convert a single file to WEBP
img-convertor convert --input ./hero.png --format webp --quality 85

# Convert the whole ./assets tree to AVIF
img-convertor convert --input ./assets -r --format avif --quality 70

# Same but implicit input = current directory
img-convertor convert -r --format webp
```

Output is written next to the source: `hero.png` → `hero.webp`.

### 2. Resize — generate responsive breakpoints

Produces one variant per breakpoint, skipping any breakpoint larger than the
source width (no upscaling). Aspect ratio is preserved.

```bash
# Default breakpoints
img-convertor resize --input ./hero.png

# Custom breakpoints
img-convertor resize --input ./hero.png --breakpoint 320,640,1024,1920

# Whole directory, recursively
img-convertor resize --input ./assets -r --breakpoint 480,960,1440
```

File naming: `hero.png` → `320x180_hero.png`, `640x360_hero.png`, …

### 3. Res-conv — resize *and* convert in one pass

The combo workflow: resize to each breakpoint **and** re-encode into the
target format. This is the command you want for shipping web assets.

```bash
img-convertor res-conv \
  --input ./assets -r \
  --format webp \
  --breakpoint 320,640,1024,1920 \
  --quality 80
```

Output: `320x180_hero.webp`, `640x360_hero.webp`, …

### 4. Interactive mode

No flags? Just run the binary:

```bash
img-convertor
```

A guided console walks you through command selection, input path, breakpoints,
format, and quality — with your saved defaults pre-filled.

### 5. Persistent defaults — the `config` command

Instead of retyping `--quality`, `--breakpoint`, or `--format` on every run,
persist your preferred defaults. They are used as fallbacks when a flag is
omitted; explicit flags always win.

```bash
img-convertor config set quality 80
img-convertor config set format avif

img-convertor config list      # show current values + source (user/default)
img-convertor config get quality
img-convertor config unset quality
img-convertor config reset     # wipe the whole config file
img-convertor config path      # print the config file path
```

### 6. Breakpoint presets — `config preset`

Keep several named breakpoint lists and switch between them without retyping.

```bash
img-convertor config preset add mobile  "320,640"
img-convertor config preset add retina  "480,960,1440"
img-convertor config preset add print   "1200,2400,3600"

img-convertor config preset list        # all presets, the default is highlighted
img-convertor config preset use retina  # mark "retina" as the default
img-convertor config preset clear-default
img-convertor config preset remove mobile
```

Once a preset is marked as default, every `resize` / `res-conv` invocation
uses it when `--breakpoint` is omitted. `config list` shows the active preset
next to the resolved breakpoint list.

**Save on the fly.** In the interactive console, if you type a custom list of
breakpoints during an operation, you're offered to save it as a preset and
optionally make it the new default — so you only ever type a list once.

**Manage interactively.** The interactive main menu has a `Settings` entry
that lists, adds, removes, and selects presets without leaving the console.

The config file lives at `~/.img-convertor/config.json` (cross-platform).
Set `IMG_CONVERTOR_CONFIG_DIR` to relocate it (useful for CI, sandboxed runs,
or non-standard home directories).

---

## CLI reference

### Common options

| Flag                   | Default                     | Description                                                   |
| ---------------------- | --------------------------- | ------------------------------------------------------------- |
| `--input <path>`       | current working directory   | File or directory to process.                                 |
| `-r, --recursive`      | `false`                     | Recurse into subdirectories (directory input only).           |
| `--format <fmt>`       | `webp`                      | `webp` \| `jpeg` \| `jpg` \| `png` \| `avif`.                 |
| `--quality <0-100>`    | `85`                        | Encoder quality.                                              |
| `--breakpoint <list>`  | built-in defaults           | Comma-separated widths, e.g. `320,640,1024`.                  |

Default breakpoints: `24, 40, 80, 160, 320, 640, 768, 1024, 1280, 1536`.

### Applies-to matrix

| Flag           | `convert` | `resize` | `res-conv` |
| -------------- | :-------: | :------: | :--------: |
| `--input`      |     ✓     |    ✓     |     ✓      |
| `-r`           |     ✓     |    ✓     |     ✓      |
| `--format`     |     ✓     |    —     |     ✓      |
| `--quality`    |     ✓     |    ✓     |     ✓      |
| `--breakpoint` |     —     |    ✓     |     ✓      |

---

## Programmatic API

Everything the CLI does is exposed as plain functions — useful for build
scripts, asset pipelines, or hooking into your own tooling.

```ts
import {
  discoverImages,
  runConvert,
  runResize,
  runResizeConvert,
  resolveDefaults,
  saveSettings,
} from 'charles_lindecker/img-convertor';

const files = await discoverImages({ input: './assets', recursive: true });

await runResizeConvert({
  files,
  format: 'webp',
  breakpoints: [320, 640, 1024, 1920],
  quality: 80,
  onProgress: (r) => console.log(r.source, '→', r.outputs.length, 'variants'),
});
```

See [`src/index.ts`](./src/index.ts) for the full public surface.

---

## Project structure

```
.
├── bin/
│   └── img-convertor.js       # CLI shim (shebang) → dist/cli/index.js
├── src/
│   ├── cli/
│   │   ├── index.ts           # commander program builder + entrypoint
│   │   ├── options.ts         # shared option definitions (user-default aware)
│   │   ├── helpers.ts         # input resolution + TTY confirmation
│   │   └── commands/
│   │       ├── convert.ts
│   │       ├── resize.ts
│   │       ├── res-conv.ts
│   │       └── config.ts
│   ├── core/                  # pure logic — no I/O coupling to the CLI
│   │   ├── config.ts          # supported formats, built-in defaults
│   │   ├── types.ts           # public TS types
│   │   ├── discover.ts        # file & directory walker
│   │   ├── converter.ts       # single-file sharp encoder
│   │   ├── resizer.ts         # single-file breakpoint generator
│   │   ├── pipeline.ts        # batch runners + onProgress hook
│   │   └── settings.ts        # persistent user config (env-overridable)
│   ├── interactive/
│   │   └── index.ts           # @inquirer/prompts console flow
│   ├── ui/
│   │   └── logger.ts          # colored output + per-file reporting
│   ├── utils/
│   │   ├── breakpoints.ts     # parsing, clamping, validation
│   │   └── formats.ts         # format normalization + sharp mapping
│   └── index.ts               # programmatic API
├── tests/                     # vitest suite (mirrors src/ layout)
├── archive/
│   └── python/                # legacy Python implementation (read-only)
├── .github/workflows/ci.yml   # typecheck + test + build matrix
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Design notes**

- `core/` is pure — no `commander`, no `@inquirer/prompts`, no `picocolors`.
  The CLI and the interactive mode are two UIs wired on top of the same
  pipeline. Testing and embedding the library stay trivial.
- `settings.ts` reads/writes `~/.img-convertor/config.json` and honors
  `IMG_CONVERTOR_CONFIG_DIR` for sandboxed runs.
- Encoder options (WEBP `effort`, JPEG `mozjpeg`, PNG `compressionLevel`) are
  centralized in `converter.ts::pipeline()` so format-specific tuning lives in
  one place.

---

## Development

```bash
npm install
npm run dev -- convert --input ./samples --format webp   # run from TS
npm run build                                             # tsc → dist/
npm run typecheck                                         # no-emit check
npm run ci                                                # typecheck + test + build
```

---

## Testing

Test runner: [**vitest**](https://vitest.dev/). Coverage provider: `v8`.

```bash
npm test                # single run (what CI runs)
npm run test:watch      # watch mode
npm run test:coverage   # generates ./coverage/lcov.info
```

Image-heavy tests generate their fixtures on the fly with `sharp` (no binary
blobs in the repo). Settings tests isolate their config file via the
`IMG_CONVERTOR_CONFIG_DIR` env var.

### Current status — 80 tests · 100% coverage

```
File             | % Stmts | % Branch | % Funcs | % Lines
-----------------|---------|----------|---------|--------
All files        |   100   |   100    |   100   |   100
```

| Test file                         | Tests | Covers                                             |
| --------------------------------- | :---: | -------------------------------------------------- |
| `tests/utils/breakpoints.test.ts` |  12   | `parseBreakpoints`, `clampQuality`                 |
| `tests/utils/formats.test.ts`     |  11   | `normalizeFormat`, `extensionFor`, `sharpFormat`   |
| `tests/core/discover.test.ts`     |   7   | File/dir discovery, recursion, extension filter, POSIX FIFO |
| `tests/core/converter.test.ts`    |  12   | Format conversion (webp/jpeg/png/avif), destinations, quality |
| `tests/core/resizer.test.ts`      |   4   | Breakpoint variants, aspect ratio, no-upscale      |
| `tests/core/pipeline.test.ts`     |   6   | Batch convert / resize / res-conv + error + progress |
| `tests/core/settings.test.ts`     |  28   | Persistent defaults, presets, validation, env override |

One test is `skipIf(win32)` (POSIX FIFO) — it runs on the Linux and macOS CI
matrix.

---

## Continuous integration

GitHub Actions runs `typecheck → test → build` on every push and PR:

- Linux (Node 18, 20, 22)
- Windows (Node 20)
- macOS (Node 20)

A separate `coverage` job runs on Node 20 and uploads the `lcov` report as a
build artifact. See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

---

## Legacy

This package is a full rewrite of the original Python `dm-console-manager`
image module on top of Node.js + [`sharp`](https://sharp.pixelplumbing.com/).
The legacy Python source is kept under [`archive/python`](./archive/python)
for reference — it is not shipped with the npm package.

---

## License

[MIT](./LICENSE) © Charles Lindecker
