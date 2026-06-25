# montica-wasm

Shared video editor logic compiled to WebAssembly. Used by the [Montica](https://github.com/Nhqvu2005/Montica) web app.

## Install

```bash
npm install montica-wasm
```

## Usage

```ts
import { formatTimecode, mediaTimeFromSeconds } from "montica-wasm";

const ticks = mediaTimeFromSeconds(1.5);
const label = formatTimecode({ ticks });
```

All exports are documented in the [TypeScript definitions](./montica_wasm.d.ts).

## Source

Functions are implemented in Rust under [`rust/crates/`](../crates/). This package is the compiled WebAssembly output — do not edit it directly.

## Local development

The web app depends on the published `montica-wasm` package by default. If you are editing the WASM source in this repo and want `apps/web` to use your local build instead:

```bash
# From the repo root
bun run build:wasm

cd rust/wasm/pkg
bun link

cd ../../../apps/web
bun link montica-wasm
```

While you work, rebuild on changes from the repo root:

```bash
bun dev:wasm
```
