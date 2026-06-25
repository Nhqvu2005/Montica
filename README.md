# Montica 🎬

**AI-native video editor — Fork of OpenCut Classic with LLM integration.**

Montica is a free, open-source, AI-powered video editor that runs entirely in your browser (and soon on desktop). Forked from [OpenCut Classic](https://github.com/opencut-app/opencut-classic), Montica adds:

- 🤖 **AI Assistant** — Chat with an LLM to edit your video naturally
- 🎨 **Vibe Edit** — Describe a style ("cyberpunk", "cinematic") and AI applies effects
- 🧩 **MCP Server** — Let external AI agents (Claude Code, etc.) control the editor
- 🖥️ **Desktop App** — Tauri wrapper for native performance (coming soon)

## What's already working (from OpenCut Classic)

- Full timeline editor with multi-track compositing
- GPU-accelerated preview (WebGPU/WASM)
- 17 blend modes, 9 mask types, keyframe animation
- Text overlays, stickers, graphics, audio waveforms
- Client-side export to MP4/WebM
- Undo/redo, keyboard shortcuts, responsive panels
- On-device Whisper transcription

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 16, React 19, TypeScript |
| GPU | Rust → WASM (WGPU, WebGPU) |
| State | Zustand + EditorCore (observable) |
| UI | shadcn/ui, Radix, Tailwind CSS 4 |
| Desktop | Tauri 2 (Rust) — in progress |
| LLM | OpenAI / Anthropic / Ollama |
| Export | mediabunny + WebCodecs |

## Getting Started

```bash
# Prerequisites: Bun, Rust (for WASM), Docker (optional for auth)

cd montica
bun install

# Dev server
bun dev:web
# → http://localhost:3000

# Or with Docker (full stack)
docker compose up -d
# → http://localhost:3100
```

## Project Structure

```
montica/
├── apps/
│   ├── web/          # Next.js web app (main)
│   └── desktop/      # Tauri desktop app (coming soon)
├── rust/
│   ├── crates/       # GPU compositor, effects, masks, time
│   └── wasm/         # WASM bindings
├── packages/
│   └── mcp-server/   # MCP server for AI agents (coming soon)
└── docker-compose.yml
```

## License

MIT — based on [OpenCut Classic](https://github.com/opencut-app/opencut-classic) (MIT).
