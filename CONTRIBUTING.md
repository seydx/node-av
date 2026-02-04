# Contributing

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/node-av.git
cd node-av
git submodule update --init --recursive
npm install
npm run build
```

**Requirements:** Node.js 22.18+, Python 3.x, pkg-config.

The project uses a custom [jellyfin-ffmpeg](https://github.com/jellyfin/jellyfin-ffmpeg) fork as a git submodule in `externals/jellyfin-ffmpeg`. The native bindings are built against this specific FFmpeg version — standard FFmpeg builds are not supported. On macOS, use `./build_mac_local.sh` to compile FFmpeg and all dependencies as static libraries to `/opt/ffbuild/prefix` (build tools are installed automatically via Homebrew).

## Development

### Building

```bash
npm run build              # Full build (generate + native + TypeScript + tests + examples)
npm run build:native       # Native C++ bindings only
npm run build:tsc          # TypeScript only
npm run build:tests        # Tests only
npm run build:examples     # Examples only
npm run clean              # Clean all build artifacts and rebuild
```

### Testing & Linting

```bash
npm run test:all                   # Build + run all tests
npm run test                       # Run tests (assumes already built)
tsx --test test/decoder.test.ts    # Run a single test file

npm run lint               # ESLint
npm run lint:fix           # ESLint with auto-fix
npm run format             # Prettier
```

### Code Generation

Constants in `src/constants/` are auto-generated from FFmpeg headers — don't edit them directly.

```bash
npm run generate           # Regenerate all constants (includes FFmpeg patching)
npm run generate:constants # FFmpeg constants only
npm run generate:encoders  # Encoder list only
npm run generate:decoders  # Decoder list only
npm run generate:layouts   # Channel layouts only
npm run generate:hardware  # Hardware types only
```

Modify the generator scripts in `scripts/` if changes are needed.

## Architecture

The project has three layers:

- **`src/bindings/`** — C++ N-API bindings to FFmpeg. Each component has `*.cc` (registration), `*_async.cc` (async workers), `*_sync.cc` (sync methods).
- **`src/lib/`** — Low-level TypeScript wrappers around the native bindings.
- **`src/api/`** — High-level API with resource management, pipelines, and async generators.

### Resource Management

Native objects use reference counting. TypeScript classes implement the Disposable pattern — use `using` / `await using` for automatic cleanup, or call `.free()` / `.close()` manually.

### Platform-Specific Code

Device enumeration (`src/bindings/device_*.cc`) has platform-specific implementations:
- **macOS** — AVFoundation / CoreMedia
- **Linux** — Video4Linux (video), ALSA (audio)
- **Windows** — DirectShow

## Pull Requests

1. Create a branch from `main`
2. Make your changes
3. Verify: `npm run lint && npm run build:tsc && npm run build:tests && npm run build:examples && npm run test`
4. Submit a PR with a clear description of what and why

## Conventions

- ESM with `.js` extensions in imports
- Prettier (2-space indent, single quotes, semicolons, max 170 chars)
- Node.js built-in test runner (`node:test`) — every new feature or bugfix should have tests
- JSDoc on all public classes, methods, and interfaces
- `using` / `await using` for resource cleanup
- Async by default, sync variants suffixed with `Sync`
- Use predefined constants from `src/constants/` instead of magic numbers
- Mark internal API methods with `@internal`
