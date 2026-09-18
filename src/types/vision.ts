export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseLandmarkResult {
  landmarks: NormalizedLandmark[][];
  worldLandmarks?: NormalizedLandmark[][];
}

export interface WebcamState {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  isMock: boolean;
  facingMode: "user" | "environment";
}

export interface AnthropometricMetrics {
  detectedHeightCm: number;
  calibratedHeightCm: number;
  scaleFactor: number; // cm per pixel
  shoulderWidthCm: number;
  chestDepthCm: number;
  waistWidthCm: number;
  waistCircumferenceCm: number;
  hipWidthCm: number;
  torsoLengthCm: number;
  armLengthCm: number;
  legLengthCm: number;
  estimatedWeightKg: number;
  bodyFatPercentage: number;
  leanBodyMassKg: number;
  skeletalMuscleMassKg: number;
  confidence: number;
  poseDetected: boolean;
}
