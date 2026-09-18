import type { NormalizedLandmark } from "../../src/types/vision.ts";

/**
 * Standard adult humanoid front pose fixture (height ~178cm, athletic build)
 */
export const standardFrontPose: NormalizedLandmark[] = Array.from(
  { length: 33 },
  (_, idx) => {
    // Default landmarks positioned anatomically in 640x480 frame
    const base: NormalizedLandmark = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 };

    // Head
    if (idx === 0) return { x: 0.5, y: 0.18, z: -0.05, visibility: 0.99 };
    if (idx === 7) return { x: 0.46, y: 0.18, z: 0.02, visibility: 0.95 }; // Left ear
    if (idx === 8) return { x: 0.54, y: 0.18, z: 0.02, visibility: 0.95 }; // Right ear

    // Shoulders
    if (idx === 11) return { x: 0.43, y: 0.28, z: 0.0, visibility: 0.99 }; // Left
    if (idx === 12) return { x: 0.57, y: 0.28, z: 0.0, visibility: 0.99 }; // Right

    // Elbows
    if (idx === 13) return { x: 0.38, y: 0.42, z: 0.04, visibility: 0.95 };
    if (idx === 14) return { x: 0.62, y: 0.42, z: 0.04, visibility: 0.95 };

    // Wrists
    if (idx === 15) return { x: 0.36, y: 0.55, z: 0.08, visibility: 0.95 };
    if (idx === 16) return { x: 0.64, y: 0.55, z: 0.08, visibility: 0.95 };

    // Hips
    if (idx === 23) return { x: 0.445, y: 0.52, z: 0.0, visibility: 0.98 };
    if (idx === 24) return { x: 0.555, y: 0.52, z: 0.0, visibility: 0.98 };

    // Knees
    if (idx === 25) return { x: 0.45, y: 0.7, z: 0.02, visibility: 0.97 };
    if (idx === 26) return { x: 0.55, y: 0.7, z: 0.02, visibility: 0.97 };

    // Ankles
    if (idx === 27) return { x: 0.46, y: 0.88, z: 0.0, visibility: 0.98 };
    if (idx === 28) return { x: 0.54, y: 0.88, z: 0.0, visibility: 0.98 };

    // Heels
    if (idx === 29) return { x: 0.455, y: 0.9, z: -0.03, visibility: 0.95 };
    if (idx === 30) return { x: 0.545, y: 0.9, z: -0.03, visibility: 0.95 };

    // Toes
    if (idx === 31) return { x: 0.46, y: 0.92, z: 0.06, visibility: 0.95 };
    if (idx === 32) return { x: 0.54, y: 0.92, z: 0.06, visibility: 0.95 };

    return base;
  },
);

/**
 * Standard side/profile pose fixture (turned 90 degrees)
 */
export const standardSidePose: NormalizedLandmark[] = Array.from(
  { length: 33 },
  (_, idx) => {
    const base: NormalizedLandmark = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 };

    // Head
    if (idx === 0) return { x: 0.53, y: 0.18, z: -0.02, visibility: 0.99 }; // Nose pointing forward
    if (idx === 7) return { x: 0.48, y: 0.18, z: 0.01, visibility: 0.95 };
    if (idx === 8) return { x: 0.51, y: 0.18, z: 0.01, visibility: 0.75 };

    // Shoulders (sagittally aligned in X, separated in Z)
    if (idx === 11) return { x: 0.49, y: 0.28, z: -0.07, visibility: 0.99 };
    if (idx === 12) return { x: 0.51, y: 0.28, z: 0.07, visibility: 0.9 };

    // Hips
    if (idx === 23) return { x: 0.49, y: 0.52, z: -0.05, visibility: 0.98 };
    if (idx === 24) return { x: 0.51, y: 0.52, z: 0.05, visibility: 0.88 };

    // Knees
    if (idx === 25) return { x: 0.5, y: 0.7, z: -0.04, visibility: 0.95 };
    if (idx === 26) return { x: 0.51, y: 0.7, z: 0.04, visibility: 0.85 };

    // Ankles & Heels
    if (idx === 27) return { x: 0.49, y: 0.88, z: -0.03, visibility: 0.97 };
    if (idx === 28) return { x: 0.5, y: 0.88, z: 0.03, visibility: 0.87 };
    if (idx === 29) return { x: 0.48, y: 0.9, z: -0.03, visibility: 0.95 };
    if (idx === 30) return { x: 0.49, y: 0.9, z: 0.03, visibility: 0.85 };
    if (idx === 31) return { x: 0.53, y: 0.92, z: -0.03, visibility: 0.95 }; // Toe forward
    if (idx === 32) return { x: 0.54, y: 0.92, z: 0.03, visibility: 0.85 };

    return base;
  },
);

/**
 * Endomorph / High BMI body profile fixture (wider waist, deeper torso)
 */
export const endomorphPose: NormalizedLandmark[] = standardFrontPose.map(
  (lm, idx) => {
    // Shoulders slightly wider
    if (idx === 11) return { ...lm, x: 0.41 };
    if (idx === 12) return { ...lm, x: 0.59 };
    // Hips & Waist considerably wider
    if (idx === 23) return { ...lm, x: 0.42 };
    if (idx === 24) return { ...lm, x: 0.58 };
    return lm;
  },
);

/**
 * Ectomorph / Slender body profile fixture (narrow shoulders and hips)
 */
export const ectomorphPose: NormalizedLandmark[] = standardFrontPose.map(
  (lm, idx) => {
    if (idx === 11) return { ...lm, x: 0.445 };
    if (idx === 12) return { ...lm, x: 0.555 };
    if (idx === 23) return { ...lm, x: 0.46 };
    if (idx === 24) return { ...lm, x: 0.54 };
    return lm;
  },
);

/**
 * Degraded pose with occluded feet and low visibility joints
 */
export const degradedOccludedPose: NormalizedLandmark[] = standardFrontPose.map(
  (lm, idx) => {
    // Feet cut off / out of frame
    if (idx >= 27) {
      return { ...lm, y: 0.99, visibility: 0.15 };
    }
    // Low visibility shoulders
    if (idx === 11 || idx === 12) {
      return { ...lm, visibility: 0.25 };
    }
    return lm;
  },
);
