# MorphoLens: Edge Anthropometric AI & Biometric Estimation PWA

[![Deploy to GitHub Pages](https://github.com/FranekJemiolo/morpholens/actions/workflows/deploy.yml/badge.svg)](https://github.com/FranekJemiolo/morpholens/actions/workflows/deploy.yml)
[![Prek Checked](https://img.shields.io/badge/prek-passing-10B981.svg?style=flat&logo=rust)](https://github.com/j178/prek)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks%20Vision-38BDF8.svg?logo=google)](https://developers.google.com/mediapipe)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black.svg?logo=three.js)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-slate.svg)](LICENSE)

**MorphoLens** is a zero-cost, 100% client-side Progressive Web App (PWA) that performs real-time computer vision body composition analysis and 3D anthropometric visualization directly inside your browser.

Powered by Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) compiled to WebAssembly/WebGL and Three.js, MorphoLens extracts 33 full-body 3D landmark points, scales coordinate vectors via an optical anchor metric, estimates real-world body dimensions (height, shoulder span, waist proxy, hips), applies anthropometric regressions (Body Fat %, Lean Mass, Total Body Weight), and dynamically drives a morphing 3D avatar in real time.

🌐 **Live Demo:** [https://franekjemiolo.github.io/morpholens/](https://franekjemiolo.github.io/morpholens/)

---

## Key Highlights

- **100% Edge Inference (Zero Cloud Compute):** AI inference runs entirely on the client using WebAssembly SIMD and WebGL acceleration. No frames, video streams, or biometric data are ever transmitted to a server.
- **Biomechanical Scale Anchor:** Resolves the fundamental scale ambiguity of single monocular 2D/3D camera feeds by coupling optical landmark vectors with a calibrated physical anchor (user height in cm).
- **Decoupled Anthropometric Engine:** Pure, deterministic TypeScript mathematical library calculating biacromial diameter, bi-iliac diameter, segment girth proxies, volumetric body segment summation, modified US Navy body density equations, and Skeletal Muscle Mass (SMM).
- **Procedural 3D Avatar Morphing:** Three.js visualization engine with exponential damping (`lerp`) that procedurally updates anatomical proportions (shoulder width, chest depth, waist taper, limb dimensions) synchronously with live biomechanical telemetry.
- **Offline Progressive Web App:** Service worker precaches all WebAssembly binaries and neural network weights (`pose_landmarker_lite.task`), enabling complete offline scanning capability in unnetworked gym, clinical, or field settings.
- **Strict Quality Standards:** 100% TypeScript strict mode, comprehensive Vitest mathematical regression suites, Playwright headless E2E verification, and [prek](https://github.com/j178/prek) pre-commit automation.

---

## Tech Stack

| Layer                | Technology                             | Purpose                                                          |
| :------------------- | :------------------------------------- | :--------------------------------------------------------------- |
| **Framework**        | React 19 + TypeScript (Strict)         | Declarative UI state management and strict type contracts        |
| **Build & Bundling** | Vite 8 + Rollup                        | Instant HMR and optimized production treeshaking                 |
| **Styling**          | Tailwind CSS 3.4                       | Cybernetic dark-mode design system and HUD aesthetics            |
| **Vision AI**        | `@mediapipe/tasks-vision` (Wasm/WebGL) | Real-time 33-point 3D skeletal landmark detection                |
| **3D Rendering**     | Three.js                               | Procedural morphable anthropometric mesh visualization           |
| **Icons**            | Lucide React                           | Lightweight vector iconography                                   |
| **Offline / PWA**    | `vite-plugin-pwa` + Workbox            | Zero-latency offline caching of model binaries                   |
| **Git Automation**   | `prek` (Rust)                          | Blazing fast pre-commit formatting, linting, and tests           |
| **Testing**          | Vitest + Playwright                    | Unit math suites and end-to-end browser camera validation        |
| **CI/CD**            | GitHub Actions                         | Automated lint, typecheck, test, build, and deploy to `gh-pages` |

---

## Repository Documentation

- 📘 [docs/VISION.md](./docs/VISION.md) - The manifesto for zero-cost, privacy-first edge anthropometric intelligence.
- 📐 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Comprehensive architectural specifications and Mermaid dataflow diagrams.
- 🛠️ [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) - Developer guidelines, testing workflows, and `prek` hook integration.

---

## Local Development & Setup

### Prerequisites

- **Node.js**: v20+ (v22+ recommended)
- **npm**: v10+
- **prek**: [prek CLI](https://github.com/j178/prek) installed (`brew install prek` or `cargo install prek`)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/FranekJemiolo/morpholens.git
cd morpholens

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

The application will be available at `http://localhost:5173`.

### Pre-commit Hooks with Prek

MorphoLens utilizes `prek` to enforce formatting, linting, TypeScript contracts, and unit test verification prior to every git commit:

```bash
# Install git pre-commit hook
prek install

# Run all quality checks against all files
prek run --all-files
```

### Verification & Testing Suite

```bash
# Run strict TypeScript type checks
npm run typecheck

# Run linter
npm run lint

# Check code formatting with Prettier
npm run format:check

# Run anthropometric math unit tests (Vitest)
npm run test:unit

# Run Playwright E2E integration tests
npm run test:e2e

# Build production bundle
npm run build
```

---

## License

MIT License. Designed and engineered by [Franek Jemiolo](https://github.com/FranekJemiolo).
