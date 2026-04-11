# Edge-Forge MVP

Edge-Forge is a local-first AI workspace for running and extending model workflows directly in the browser with WebGPU.

## Why it exists

- Teams need AI help without sending sensitive data to third-party servers.
- Cloud-only AI products are hard to customize for repeatable internal workflows.
- Local model setups are still too complex for many users.

This MVP focuses on private on-device chat plus lightweight custom skill execution.

## Roadmap

Shared skill marketplace and encrypted sync are intentionally deferred to post-MVP.  
Users can join the built-in waitlist form to get updates.

## Run locally

Prerequisite: Node.js 20+

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build production bundle: `npm run build`

## Netlify deploy

- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect fallback is configured in `netlify.toml`
- Waitlist uses a Netlify form named `waitlist`

## Domain and canonical

- Canonical URL: `https://edge-forge.nealfrazier.tech/`
