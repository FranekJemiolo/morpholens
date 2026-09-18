# MorphoLens Vision: Zero-Cost, Privacy-Preserving Anthropometric AI

## The Dilemma of Modern Biometrics

Traditional physical body assessment technologies face a trilemma of cost, accessibility, and privacy:

1. **Dual-Energy X-ray Absorptiometry (DEXA) & Hydrostatic Weighing**: The clinical gold standards for lean muscle and visceral adipose quantification require expensive multi-thousand-dollar machinery, certified radiology technicians, and physical laboratory visits.
2. **Bioelectrical Impedance Analysis (BIA)**: Consumer smart scales rely on micro-current impedance, which is notoriously susceptible to hydration fluctuations, food consumption timing, and contact resistance variations.
3. **Cloud-Based Computer Vision Scanners**: Commercial 3D body scanners and fitness apps upload uncompressed video streams or 3D point clouds of minimally clothed users to centralized corporate servers, introducing severe surveillance and data breach hazards for highly sensitive personal biometric data.

## The MorphoLens Thesis

**MorphoLens proves that accurate anthropometric telemetry and body composition estimation can be achieved at zero operational infrastructure cost with absolute cryptographic privacy.**

### 1. Zero Cloud Compute

By leveraging WebAssembly (Wasm) with SIMD vectorization and WebGL shader pipelines, state-of-the-art neural networks (MediaPipe BlazePose 3D) run directly within consumer web browsers. The user's device provides 100% of the compute. There are no backend GPU clusters, no API subscription fees, no token limits, and no server maintenance overheads. MorphoLens is hosted as a static bundle on GitHub Pages at zero hosting cost.

### 2. Radical Client-Side Privacy

No camera frames, audio, or biometric landmark vectors ever leave the client's local memory space. Inference happens frame-by-frame in volatile browser RAM:

- The video stream stays within the local `HTMLVideoElement`.
- The WebAssembly runtime processes pixels in-memory and outputs numerical normalized vectors.
- Once processed, frame buffers are immediately garbage-collected.
- Offline-first PWA caching ensures the application operates without an active internet connection after initial page load.

### 3. Democratized Health & Fitness Telemetry

By pairing 33 spatial skeletal landmarks with an optical anchor scale factor (the user's known height), MorphoLens unlocks metric-scale physical dimensions:

- **Biomechanical Segment Tracking**: Accurate assessment of limb lengths, joint alignment, and postural symmetry.
- **Volumetric Approximation**: Mathematical modeling of torso, pelvic, and limb cylindrical volume slices to derive total mass and density.
- **Validated Anthropometric Regressions**: Modified US Navy and Wilmore-Behnke circumferences derived from landmark ratios, outputting reliable Body Fat %, Lean Body Mass (LBM), and Skeletal Muscle Mass (SMM) indices.

MorphoLens transforms any standard webcam or smartphone browser into an edge biometric scanning laboratory.
