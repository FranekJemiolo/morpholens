# Contributing to MorphoLens

Thank you for your interest in contributing to **MorphoLens**! MorphoLens is an open-source, privacy-first anthropometric AI Progressive Web App. We adhere to high engineering standards, complete type safety, comprehensive mathematical testing, and automated pre-commit hygiene.

---

## 1. Development Philosophy

1. **Zero Cloud Compute**: Never introduce dependencies or network requests that transmit user video, frames, or biometric data outside the client browser.
2. **Deterministic Anthropometrics**: All biomechanical algorithms and mathematical regressions must remain pure, decoupled from React, and backed by Vitest unit tests.
3. **Strict Type Safety**: The codebase runs under strict TypeScript mode (`noImplicitAny`, `strictNullChecks`, `erasableSyntaxOnly`). Any `any` type usage is strictly rejected.
4. **Performance First**: Landmark processing loops must maintain a stable 30-60 FPS without frame drops or memory leaks.

---

## 2. Local Environment Setup

### Prerequisites

- **Node.js**: v20 or higher (v22+ recommended)
- **npm**: v10 or higher
- **prek**: The Rust-based pre-commit runner ([prek installation guide](https://github.com/j178/prek))

### Step-by-Step Setup

```bash
# Fork and clone the repository
git clone https://github.com/<your-username>/morpholens.git
cd morpholens

# Install node dependencies
npm install

# Install local prek hooks
prek install

# Start local Vite development server
npm run dev
```

---

## 3. Pre-commit Automation with `prek`

MorphoLens enforces repository quality standards automatically via `prek`. When you commit, `prek` runs:

1. **Prettier Format Check** (`npm run format:check`)
2. **Oxlint Fast Linter** (`npm run lint`)
3. **TypeScript Strict Type Check** (`npm run typecheck`)
4. **Vitest Unit Test Suite** (`npm run test:unit`)

You can manually trigger all checks across the codebase at any time:

```bash
prek run --all-files
```

If formatting issues are detected, auto-format with:

```bash
npm run format
```

---

## 4. Testing Protocols

Before submitting a PR, ensure all unit and integration tests pass:

````bash
# Run unit tests
npm run test:unit

# Run Playwright E2E tests
npm run test:e2e

# Validate production build bundle
npm run build
### Headless Browser & Mock Video Inputs

For CI environments or machines without hardware webcams, Playwright is pre-configured with fake media stream flags:

```bash
# Playwright uses synthetic Chromium media devices:
# --use-fake-ui-for-media-stream
# --use-fake-device-for-media-stream
npm run test:e2e
````

In the browser UI, click the **"SIMULATE"** button on the camera HUD to toggle the synthetic 33-point biomechanical mannequin without requiring webcam permissions.

---

## 5. Submitting Pull Requests

1. **Branch Naming**: Use descriptive branch names:
   - `feat/feature-name`
   - `fix/bug-description`
   - `refactor/subsystem-name`
   - `docs/doc-update`
2. **Commit Messages**: Follow Conventional Commits:
   - `feat(math): introduce Wilmore-Behnke body density regression`
   - `fix(camera): handle camera permission denial gracefully`
   - `test(e2e): add mock stream validation test`
3. **Pull Request Description**:
   - Clearly state the problem and the proposed solution.
   - Attach screenshots or recordings for any UI changes.
   - Confirm that `prek run --all-files` and `npm run test:e2e` pass without warnings.

---

## Code of Conduct

MorphoLens is committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Be respectful and collaborative.
