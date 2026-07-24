<!-- xonettn -->
<div align="center">

# 🔧 Edge Forge

Build and run private AI workflows directly on your device with WebGPU. Edge-Forge targets teams who need local control, speed, and custom skills.


![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Netlify](https://img.shields.io/badge/Netlify-00C7B7?logo=netlify&logoColor=white)

![Deploy](https://img.shields.io/badge/Deployed-Netlify-00C7B7?logo=netlify&logoColor=white)

</div>

---

## 📋 Overview
Build and run private AI workflows directly on your device with WebGPU. Edge-Forge targets teams who need local control, speed, and custom skills.

## 📦 Tech Stack
- React
- Vite
- Express
- Netlify (deployed)

## 🗂️ Project Structure
```
edge-forge/
  - public
  - src
  (23 files total)
```

## 🚀 Getting Started

### 📋 Prerequisites
- Node.js (v18+)
- npm or yarn

### 📦 Installation
```bash
git clone https://github.com/1nc0gn30/edge-forge.git
cd edge-forge
npm install
```

### 💻 Development
```bash
npm run dev
```

### 🔨 Build
```bash
npm run build
```

### ⚙️ Available Scripts
  npm run dev - vite --port=3000 --host=0.0.0.0
  npm run build - vite build
  npm run preview - vite preview
  npm run clean - rm -rf dist
  npm run lint - tsc --noEmit

## 📂 Original README
<details>
<summary>Click to expand original README</summary>

# Edge-Forge MVP

Edge-Forge is a local-first AI workspace for running and extending model workflows directly in the browser with WebGPU.

## Why it exists

- Teams need AI help without sending sensitive data to third-party servers.
- Cloud-only AI products are hard to customize for repeatable internal workflows.
- Local model setups are still too complex for many users.

This MVP focuses on private on-device chat plus lightweight custom skill execution.

## 🗺️ Roadmap

Shared skill marketplace and encrypted sync are intentionally deferred to post-MVP.  
Users can join the built-in waitlist form to get updates.

## 🚀 Run locally

Prerequisite: Node.js 20+

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build production bundle: `npm run build`

## 🚀 Netlify deploy

- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect fallback is configured in `netlify.toml`
- Waitlist uses a Netlify form named `waitlist`

## Domain and canonical

- Canonical URL: `https://edge-forge.nealfrazier.tech/`

</details>

## 📝 TODO / Roadmap
- [ ] Add unit tests
- [ ] Add LICENSE file
- [ ] Add Dockerfile for containerized deployment
- [ ] Consider adding Tailwind CSS
- [ ] Add CI/CD pipeline
- [ ] Add contribution guidelines (CONTRIBUTING.md)
- [ ] Improve error handling and edge cases
- [ ] Add environment variable documentation
- [ ] Update dependencies to latest versions
- [ ] Add code comments and inline documentation

## 🚀 Deployment
This project is deployed on Netlify. See netlify.toml for configuration.

## 👤 Author
**Neal Frazier** - [@AshAmplifies](https://github.com/1nc0gn30)

## 🔗 Links
- GitHub: https://github.com/1nc0gn30/edge-forge

---
*This README was enhanced as part of the neals-projects-2026 batch update.*

---

<div align="center">

**[xonettn]** · Built by [Neal Frazier](https://github.com/1nc0gn30) · [@AshAmplifies](https://twitter.com/AshAmplifies)

</div>
