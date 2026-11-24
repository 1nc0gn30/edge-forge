# Edge-Forge

Local-first AI workflow builder, custom skill studio, and WebGPU VRAM fit inspector that runs entirely in the browser with zero remote API keys.

- **Live URL**: [https://edge-forge.nealfrazier.tech/](https://edge-forge.nealfrazier.tech/)
- **Repository**: [https://github.com/1nc0gn30/edge-forge](https://github.com/1nc0gn30/edge-forge)
- **Access**: 100% free and open-source (zero paywalls, zero accounts, zero external prompt egress)

## What It Does

1. **Interactive Workflow Pipeline Builder** (`src/components/PipelineWorkspace.tsx`, `src/engine/workflowRunner.ts`)
   - Chain ordered nodes: `redact_pii`, `regex_filter`, `extract_json`, `lint_json`, `chunk_text`, `summarize` (TF-IDF extractive scorer), `template_prompt`, `custom_skill`, and `webgpu_generate`.
   - Reorder, toggle, configure inline, persist to `localStorage`, and export/import portable `.edge-forge.json` workflow definitions.
   - Inspect live step-by-step execution traces with millisecond timing, char/token deltas, redaction/key metadata, and downloadable output.

2. **Custom Skill & Prompt Template Studio** (`src/components/SkillStudio.tsx`, `src/engine/localSkills.ts`)
   - Author reusable local prompt templates (`{{input}}`, `{{word_count}}`, `{{line_count}}`, `{{est_tokens}}`, JSON field interpolation) or deterministic transforms (`kv_to_json`, `word_freq`, `markdown_table`, `math_eval`, `extract_urls`, `extract_emails`, `dedupe_lines`).
   - Uses a safe recursive-descent arithmetic parser (`safeMathEval`) with zero `eval()` or `Function()` execution.
   - Live sandbox preview updates immediately and attaches skills directly to the active pipeline.

3. **WebGPU & Model VRAM Fit Inspector** (`src/components/HardwareInspector.tsx`, `src/engine/hardwareInspector.ts`)
   - Queries `navigator.gpu.requestAdapter()`, buffer limits, `navigator.deviceMemory`, and `navigator.hardwareConcurrency` cleanly without throwing errors on non-WebGPU browsers.
   - Evaluates quantized `MLC-WebGPU` and `GGUF` models (`SmolLM2 360M` through `Qwen 2.5 14B`) against live hardware or simulated edge presets (`4 GB Mobile` → `24 GB GPU Rig`).
   - Lazy-loads `@mlc-ai/web-llm` on demand only when a WebGPU-capable user chooses to initialize weights; otherwise falls back cleanly to the deterministic local CPU engine.

## Local Development & Verification

Prerequisite: Node.js 20+

```bash
npm install
npm run lint    # TypeScript type-check (tsc --noEmit)
npm test        # Unit + SEO/AEO/open-access guardrail tests
npm run build   # Production Vite bundle into dist/
npm run dev     # Local dev server on http://localhost:3000
```

## Netlify Deployment

- Build command: `npm run build`
- Publish directory: `dist`
- Security headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`) and SPA catch-all redirect are configured in `netlify.toml`.

## Attribution & Support

Engineered by **Neal Frazier Tech (@1nc0gn30)** • [NullAI Platform](https://nullai.tech).

- Optional coffee tip (Stripe): `https://buy.stripe.com/3cIfZg27PdKo2D64Ocfw40X`
- Solana tip address: `GG2eQbVh8ut1BK6j1A2tz7pSySdLpD38BgyEhGcxdXoK`
