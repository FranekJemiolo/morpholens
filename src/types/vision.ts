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
  videoWidth: number;
  videoHeight: number;
  aspectRatio: number;
}

export type CaptureStage =
  | "idle"
  | "front_aligning"
  | "front_countdown"
  | "front_captured"
  | "side_prompt"
  | "side_aligning"
  | "side_countdown"
  | "side_captured"
  | "completed";

export type AlignmentState = "out_of_frame" | "aligning" | "locked";

export interface PoseQualityAssessment {
  qualityScore: number; // 0..100
  isValid: boolean;
  alignmentState: AlignmentState;
  feedbackMessage: string;
  missingLandmarks: string[];
}

export interface FrontViewMeasurements {
  shoulderWidthCm: number;
  hipWidthCm: number;
  waistWidthCm: number;
  torsoLengthCm: number;
  armLengthCm: number;
  legLengthCm: number;
  detectedHeightCm: number;
  scaleFactor: number;
  timestamp: number;
}

export interface SideViewMeasurements {
  chestDepthCm: number;
  abdominalDepthCm: number;
  cervicalPostureAngleDeg: number;
  pelvicTiltAngleDeg: number;
  timestamp: number;
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
  bodyFatSiri: number;
  bodyFatBrozek: number;
  bodyFatNavy: number;
  leanBodyMassKg: number;
  skeletalMuscleMassKg: number;
  confidence: number;
  poseDetected: boolean;
  isDualAngle: boolean;
  biologicalSex?: "male" | "female";
  bmi?: number;
  frontSnapshot?: FrontViewMeasurements;
  sideSnapshot?: SideViewMeasurements;
}

export interface SampleHumanPreset {
  id: string;
  name: string;
  gender: "male" | "female";
  orientation: "front" | "side";
  path: string;
  suggestedHeightCm: number;
}
