import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "../types/vision.ts";

export class PoseLandmarkerService {
  private static instance: PoseLandmarkerService | null = null;
  private landmarker: PoseLandmarker | null = null;
  private isInitializing = false;
  private initPromise: Promise<PoseLandmarker | null> | null = null;

  public static getInstance(): PoseLandmarkerService {
    if (!PoseLandmarkerService.instance) {
      PoseLandmarkerService.instance = new PoseLandmarkerService();
    }
    return PoseLandmarkerService.instance;
  }

  public async init(): Promise<PoseLandmarker | null> {
    if (this.landmarker) return this.landmarker;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || "./";
        const localWasmPath = `${baseUrl.replace(/\/$/, "")}/wasm`;
        const localModelPath = `${baseUrl.replace(/\/$/, "")}/models/pose_landmarker_lite.task`;
        const cdnWasmPath =
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
        const cdnModelPath =
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

        let vision;
        try {
          vision = await FilesetResolver.forVisionTasks(localWasmPath);
        } catch {
          console.warn(
            "Local wasm loading failed, falling back to CDN wasm...",
          );
          vision = await FilesetResolver.forVisionTasks(cdnWasmPath);
        }

        // Try GPU delegate first, fallback to CPU
        try {
          this.landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: localModelPath,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuError) {
          console.warn(
            "GPU delegate failed, attempting CPU fallback...",
            gpuError,
          );
          try {
            this.landmarker = await PoseLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: localModelPath,
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numPoses: 1,
              minPoseDetectionConfidence: 0.5,
              minPosePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
            });
          } catch {
            console.warn("Local model failed, attempting CDN model...");
            this.landmarker = await PoseLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: cdnModelPath,
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numPoses: 1,
              minPoseDetectionConfidence: 0.5,
              minPosePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
            });
          }
        }

        return this.landmarker;
      } catch (err) {
        console.error("Failed to initialize PoseLandmarker:", err);
        return null;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  public detectForVideo(
    source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    timestampMs: number,
  ): PoseLandmarkerResult | null {
    if (!this.landmarker) return null;
    try {
      if (source instanceof HTMLVideoElement) {
        if (
          source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          source.videoWidth > 0 &&
          source.videoHeight > 0
        ) {
          return this.landmarker.detectForVideo(source, timestampMs);
        }
        return null;
      } else if (source instanceof HTMLImageElement) {
        if (source.complete && source.naturalWidth > 0) {
          return this.landmarker.detectForVideo(source, timestampMs);
        }
        return null;
      } else if (source instanceof HTMLCanvasElement) {
        if (source.width > 0 && source.height > 0) {
          return this.landmarker.detectForVideo(source, timestampMs);
        }
        return null;
      }
      return null;
    } catch (err) {
      console.warn("Pose detection error on source:", err);
      return null;
    }
  }

  public isReady(): boolean {
    return this.landmarker !== null;
  }

  public isLoading(): boolean {
    return this.isInitializing;
  }
}

/**
 * Standard MediaPipe 33-point skeletal connection pairs
 */
export const POSE_CONNECTIONS: [number, number][] = [
  // Head / Face
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],

  // Shoulders & Upper Body
  [11, 12], // Shoulder span
  [11, 13], // Left upper arm
  [13, 15], // Left forearm
  [12, 14], // Right upper arm
  [14, 16], // Right forearm

  // Hands
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],

  // Torso
  [11, 23], // Left flank
  [12, 24], // Right flank
  [23, 24], // Pelvic base / Hips

  // Lower Body (Legs)
  [23, 25], // Left thigh
  [24, 26], // Right thigh
  [25, 27], // Left shin
  [26, 28], // Right shin
  [27, 29], // Left heel
  [28, 30], // Right heel
  [27, 31], // Left toe
  [28, 32], // Right toe
  [29, 31],
  [30, 32],
];

/**
 * Generates an anatomically realistic synthetic pose for mock simulation & E2E testing
 */
export function generateSyntheticPose(
  timeSeconds: number,
  poseFactor = 1.0,
): NormalizedLandmark[] {
  const sway = Math.sin(timeSeconds * 1.5) * 0.015;
  const breath = Math.sin(timeSeconds * 2.0) * 0.008;

  // 33 normalized landmarks
  const landmarks: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0.0,
    visibility: 0.95,
  }));

  // Head (0..10)
  landmarks[0] = { x: 0.5 + sway, y: 0.18, z: -0.05, visibility: 0.99 }; // Nose
  landmarks[1] = { x: 0.485 + sway, y: 0.165, z: -0.04, visibility: 0.98 };
  landmarks[2] = { x: 0.475 + sway, y: 0.165, z: -0.04, visibility: 0.98 };
  landmarks[3] = { x: 0.465 + sway, y: 0.165, z: -0.04, visibility: 0.95 };
  landmarks[4] = { x: 0.515 + sway, y: 0.165, z: -0.04, visibility: 0.98 };
  landmarks[5] = { x: 0.525 + sway, y: 0.165, z: -0.04, visibility: 0.98 };
  landmarks[6] = { x: 0.535 + sway, y: 0.165, z: -0.04, visibility: 0.95 };
  landmarks[7] = { x: 0.45 + sway, y: 0.18, z: 0.02, visibility: 0.9 }; // Left ear
  landmarks[8] = { x: 0.55 + sway, y: 0.18, z: 0.02, visibility: 0.9 }; // Right ear
  landmarks[9] = { x: 0.485 + sway, y: 0.205, z: -0.04, visibility: 0.9 };
  landmarks[10] = { x: 0.515 + sway, y: 0.205, z: -0.04, visibility: 0.9 };

  // Shoulders (11, 12) - anatomically scaled to standard aspect ratio
  const shoulderHalfSpan = 0.075 * poseFactor;
  landmarks[11] = {
    x: 0.5 - shoulderHalfSpan + sway,
    y: 0.28 - breath,
    z: 0.0,
    visibility: 0.99,
  };
  landmarks[12] = {
    x: 0.5 + shoulderHalfSpan + sway,
    y: 0.28 - breath,
    z: 0.0,
    visibility: 0.99,
  };

  // Elbows (13, 14)
  landmarks[13] = {
    x: 0.38 + sway,
    y: 0.42,
    z: 0.04,
    visibility: 0.95,
  };
  landmarks[14] = {
    x: 0.62 + sway,
    y: 0.42,
    z: 0.04,
    visibility: 0.95,
  };

  // Wrists (15, 16)
  landmarks[15] = {
    x: 0.36 + sway,
    y: 0.55,
    z: 0.08,
    visibility: 0.95,
  };
  landmarks[16] = {
    x: 0.64 + sway,
    y: 0.55,
    z: 0.08,
    visibility: 0.95,
  };

  // Hands (17..22)
  for (let i = 17; i <= 22; i++) {
    const isLeft = i % 2 === 1;
    landmarks[i] = {
      x: isLeft ? 0.35 + sway : 0.65 + sway,
      y: 0.58 + (i % 3) * 0.015,
      z: 0.08,
      visibility: 0.9,
    };
  }

  // Pelvis / Hips (23, 24)
  const hipHalfSpan = 0.055 * poseFactor;
  landmarks[23] = {
    x: 0.5 - hipHalfSpan + sway * 0.7,
    y: 0.52,
    z: 0.0,
    visibility: 0.98,
  };
  landmarks[24] = {
    x: 0.5 + hipHalfSpan + sway * 0.7,
    y: 0.52,
    z: 0.0,
    visibility: 0.98,
  };

  // Knees (25, 26)
  landmarks[25] = {
    x: 0.45 + sway * 0.4,
    y: 0.7,
    z: 0.02,
    visibility: 0.97,
  };
  landmarks[26] = {
    x: 0.55 + sway * 0.4,
    y: 0.7,
    z: 0.02,
    visibility: 0.97,
  };

  // Ankles (27, 28)
  landmarks[27] = {
    x: 0.46 + sway * 0.2,
    y: 0.88,
    z: 0.0,
    visibility: 0.98,
  };
  landmarks[28] = {
    x: 0.54 + sway * 0.2,
    y: 0.88,
    z: 0.0,
    visibility: 0.98,
  };

  // Heels (29, 30)
  landmarks[29] = { x: 0.43 + sway * 0.2, y: 0.9, z: -0.03, visibility: 0.95 };
  landmarks[30] = { x: 0.57 + sway * 0.2, y: 0.9, z: -0.03, visibility: 0.95 };

  // Toes (31, 32)
  landmarks[31] = { x: 0.44 + sway * 0.2, y: 0.92, z: 0.06, visibility: 0.95 };
  landmarks[32] = { x: 0.56 + sway * 0.2, y: 0.92, z: 0.06, visibility: 0.95 };

  return landmarks;
}
