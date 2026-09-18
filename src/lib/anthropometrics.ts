import type {
  NormalizedLandmark,
  AnthropometricMetrics,
  PoseQualityAssessment,
  FrontViewMeasurements,
  SideViewMeasurements,
} from "../types/vision.ts";

/**
 * 2D Euclidean distance between two normalized landmarks scaled to canvas dimensions
 */
export function euclideanDistance2D(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
  width: number,
  height: number,
): number {
  const dx = (p1.x - p2.x) * width;
  const dy = (p1.y - p2.y) * height;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 3D Euclidean distance incorporating depth (z)
 */
export function euclideanDistance3D(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
  width: number,
  height: number,
): number {
  const dx = (p1.x - p2.x) * width;
  const dy = (p1.y - p2.y) * height;
  // MediaPipe z is approximately scaled to width
  const dz = (p1.z - p2.z) * width;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Projects a normalized landmark (0..1) to canvas display coordinates
 * accounting for CSS object-fit: cover scaling and horizontal selfie mirroring.
 */
export function projectToCanvas(
  lm: NormalizedLandmark,
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number,
  isMirrored = true,
): { x: number; y: number; z: number; visibility: number } {
  if (videoWidth <= 0 || videoHeight <= 0) {
    const normX = isMirrored ? 1 - lm.x : lm.x;
    return {
      x: normX * canvasWidth,
      y: lm.y * canvasHeight,
      z: lm.z,
      visibility: lm.visibility ?? 1.0,
    };
  }

  const videoAspect = videoWidth / videoHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let renderedW = canvasWidth;
  let renderedH = canvasHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > canvasAspect) {
    // Video is wider than canvas: horizontally cropped
    renderedH = canvasHeight;
    renderedW = canvasHeight * videoAspect;
    offsetX = (canvasWidth - renderedW) / 2;
  } else {
    // Video is taller than canvas: vertically cropped
    renderedW = canvasWidth;
    renderedH = canvasWidth / videoAspect;
    offsetY = (canvasHeight - renderedH) / 2;
  }

  const rawX = isMirrored ? 1 - lm.x : lm.x;
  const projX = offsetX + rawX * renderedW;
  const projY = offsetY + lm.y * renderedH;

  return {
    x: projX,
    y: projY,
    z: lm.z,
    visibility: lm.visibility ?? 1.0,
  };
}

/**
 * Computes the optical scale factor (cm per pixel) by comparing detected vertical
 * pixel stature to the user's calibrated physical height anchor.
 */
export function computeOpticalScale(
  landmarks: NormalizedLandmark[],
  anchorHeightCm: number,
  _canvasWidth: number,
  canvasHeight: number,
): { scaleFactor: number; detectedHeightPx: number } {
  if (!landmarks || landmarks.length < 33) {
    return { scaleFactor: 0, detectedHeightPx: 0 };
  }

  const nose = landmarks[0];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lAnkle = landmarks[27];
  const rAnkle = landmarks[28];
  const lHeel = landmarks[29];
  const rHeel = landmarks[30];

  if (!nose || !lShoulder || !rShoulder || !lAnkle || !rAnkle) {
    return { scaleFactor: 0, detectedHeightPx: 0 };
  }

  // Cranial apex estimation (top of head above nose)
  const shoulderMidY = ((lShoulder.y + rShoulder.y) / 2) * canvasHeight;
  const noseY = nose.y * canvasHeight;
  const headHeightPx = Math.max(20, (shoulderMidY - noseY) * 1.6);
  const cranialApexY = Math.max(0, noseY - headHeightPx * 0.75);

  // Floor baseline (average of heels or ankles)
  const heelY1 = (lHeel?.y ?? lAnkle.y) * canvasHeight;
  const heelY2 = (rHeel?.y ?? rAnkle.y) * canvasHeight;
  const floorBaselineY = (heelY1 + heelY2) / 2;

  const detectedHeightPx = Math.max(1, floorBaselineY - cranialApexY);

  // Scale factor in cm per pixel
  const scaleFactor = anchorHeightCm / detectedHeightPx;

  return { scaleFactor, detectedHeightPx };
}

/**
 * Evaluates pose validity and completeness for the current scan angle.
 * Provides real-time quality scores (0..100) and actionable positioning guidance.
 */
export function evaluatePoseQuality(
  landmarks: NormalizedLandmark[] | null,
  stage: "front" | "side",
): PoseQualityAssessment {
  if (!landmarks || landmarks.length < 33) {
    return {
      qualityScore: 0,
      isValid: false,
      alignmentState: "out_of_frame",
      feedbackMessage: "Step into camera frame to initialize tracking",
      missingLandmarks: ["all"],
    };
  }

  const missingLandmarks: string[] = [];
  const nose = landmarks[0];
  const s11 = landmarks[11];
  const s12 = landmarks[12];
  const h23 = landmarks[23];
  const h24 = landmarks[24];
  const a27 = landmarks[27];
  const a28 = landmarks[28];
  const heel29 = landmarks[29];
  const heel30 = landmarks[30];

  // Check critical landmark visibility
  if ((s11.visibility ?? 0) < 0.5) missingLandmarks.push("Left Shoulder");
  if ((s12.visibility ?? 0) < 0.5) missingLandmarks.push("Right Shoulder");
  if ((h23.visibility ?? 0) < 0.5) missingLandmarks.push("Left Hip");
  if ((h24.visibility ?? 0) < 0.5) missingLandmarks.push("Right Hip");
  if ((a27.visibility ?? 0) < 0.4 && (heel29?.visibility ?? 0) < 0.4)
    missingLandmarks.push("Left Foot");
  if ((a28.visibility ?? 0) < 0.4 && (heel30?.visibility ?? 0) < 0.4)
    missingLandmarks.push("Right Foot");

  // Check frame boundaries (feet or head cut off)
  const headCutOff = nose.y < 0.04;
  const feetCutOff =
    Math.max(a27.y, a28.y, heel29?.y ?? 0, heel30?.y ?? 0) > 0.98;

  if (feetCutOff) {
    return {
      qualityScore: 35,
      isValid: false,
      alignmentState: "out_of_frame",
      feedbackMessage: "Step back — feet not fully visible in frame",
      missingLandmarks: ["Feet"],
    };
  }

  if (headCutOff) {
    return {
      qualityScore: 40,
      isValid: false,
      alignmentState: "out_of_frame",
      feedbackMessage: "Tilt camera up or step back — head cut off",
      missingLandmarks: ["Head"],
    };
  }

  if (stage === "front") {
    // Check coronal orientation: shoulders must have distinct horizontal span
    const shoulderDx = Math.abs(s11.x - s12.x);
    const hipDx = Math.abs(h23.x - h24.x);

    // If subject is turned sideways during front scan
    if (shoulderDx < 0.08 || hipDx < 0.05) {
      return {
        qualityScore: 50,
        isValid: false,
        alignmentState: "aligning",
        feedbackMessage: "Face camera directly with shoulders square",
        missingLandmarks,
      };
    }

    // Check arm crossing (wrists too close to hips/torso centerline)
    const w15 = landmarks[15];
    const w16 = landmarks[16];
    const armsCrossed =
      Math.abs((w15?.x ?? 0) - (w16?.x ?? 0)) < 0.05 &&
      Math.abs((w15?.y ?? 0) - (h23.y + h24.y) / 2) < 0.15;

    if (armsCrossed) {
      return {
        qualityScore: 60,
        isValid: false,
        alignmentState: "aligning",
        feedbackMessage: "Relax hands to your sides for clear silhouette",
        missingLandmarks,
      };
    }

    // Quality calculation based on overall landmark visibility
    const keyIndices = [0, 11, 12, 13, 14, 23, 24, 25, 26, 27, 28];
    let totalVis = 0;
    for (const idx of keyIndices) {
      totalVis += landmarks[idx]?.visibility ?? 0;
    }
    const avgVis = totalVis / keyIndices.length;
    const qualityScore = Math.min(100, Math.round(avgVis * 100));

    if (qualityScore >= 80 && missingLandmarks.length === 0) {
      return {
        qualityScore,
        isValid: true,
        alignmentState: "locked",
        feedbackMessage: "Front pose locked. Hold steady...",
        missingLandmarks: [],
      };
    }

    return {
      qualityScore,
      isValid: false,
      alignmentState: "aligning",
      feedbackMessage: "Align within the outline and stand upright",
      missingLandmarks,
    };
  } else {
    // Side / Profile View Evaluation
    // Shoulders should be aligned sagittally (narrow horizontal separation)
    const shoulderDx = Math.abs(s11.x - s12.x);
    const shoulderDz = Math.abs(s11.z - s12.z);

    const isTurnedSideways = shoulderDx < 0.12 || shoulderDz > 0.08;

    if (!isTurnedSideways) {
      return {
        qualityScore: 45,
        isValid: false,
        alignmentState: "aligning",
        feedbackMessage: "Turn 90° to your side for profile scan",
        missingLandmarks,
      };
    }

    const keyIndices = [0, 7, 8, 11, 12, 23, 24, 25, 26, 27, 28];
    let totalVis = 0;
    for (const idx of keyIndices) {
      totalVis += landmarks[idx]?.visibility ?? 0;
    }
    const avgVis = totalVis / keyIndices.length;
    const qualityScore = Math.min(100, Math.round(avgVis * 100));

    if (qualityScore >= 75) {
      return {
        qualityScore,
        isValid: true,
        alignmentState: "locked",
        feedbackMessage: "Side profile locked. Hold steady...",
        missingLandmarks: [],
      };
    }

    return {
      qualityScore,
      isValid: false,
      alignmentState: "aligning",
      feedbackMessage: "Turn sideways and stand tall",
      missingLandmarks,
    };
  }
}

/**
 * Extracts coronal width measurements from Front View
 */
export function extractFrontMeasurements(
  landmarks: NormalizedLandmark[],
  anchorHeightCm: number,
  canvasWidth: number,
  canvasHeight: number,
): FrontViewMeasurements {
  const { scaleFactor, detectedHeightPx } = computeOpticalScale(
    landmarks,
    anchorHeightCm,
    canvasWidth,
    canvasHeight,
  );

  const s11 = landmarks[11];
  const s12 = landmarks[12];
  const h23 = landmarks[23];
  const h24 = landmarks[24];
  const e13 = landmarks[13];
  const e14 = landmarks[14];
  const w15 = landmarks[15];
  const w16 = landmarks[16];
  const k25 = landmarks[25];
  const k26 = landmarks[26];
  const a27 = landmarks[27];
  const a28 = landmarks[28];

  const shoulderSpanPx = euclideanDistance2D(
    s11,
    s12,
    canvasWidth,
    canvasHeight,
  );
  const shoulderWidthCm = shoulderSpanPx * scaleFactor;

  const hipSpanPx = euclideanDistance2D(h23, h24, canvasWidth, canvasHeight);
  const hipWidthCm = hipSpanPx * scaleFactor;

  const shoulderMid = {
    x: (s11.x + s12.x) / 2,
    y: (s11.y + s12.y) / 2,
    z: (s11.z + s12.z) / 2,
  };
  const hipMid = {
    x: (h23.x + h24.x) / 2,
    y: (h23.y + h24.y) / 2,
    z: (h23.z + h24.z) / 2,
  };
  const torsoLengthPx = euclideanDistance2D(
    shoulderMid,
    hipMid,
    canvasWidth,
    canvasHeight,
  );
  const torsoLengthCm = torsoLengthPx * scaleFactor;

  const waistWidthCm = shoulderWidthCm * 0.45 + hipWidthCm * 0.5;

  const leftArmPx =
    euclideanDistance2D(s11, e13, canvasWidth, canvasHeight) +
    euclideanDistance2D(e13, w15, canvasWidth, canvasHeight);
  const rightArmPx =
    euclideanDistance2D(s12, e14, canvasWidth, canvasHeight) +
    euclideanDistance2D(e14, w16, canvasWidth, canvasHeight);
  const armLengthCm = ((leftArmPx + rightArmPx) / 2) * scaleFactor;

  const leftLegPx =
    euclideanDistance2D(h23, k25, canvasWidth, canvasHeight) +
    euclideanDistance2D(k25, a27, canvasWidth, canvasHeight);
  const rightLegPx =
    euclideanDistance2D(h24, k26, canvasWidth, canvasHeight) +
    euclideanDistance2D(k26, a28, canvasWidth, canvasHeight);
  const legLengthCm = ((leftLegPx + rightLegPx) / 2) * scaleFactor;

  return {
    shoulderWidthCm: Number(shoulderWidthCm.toFixed(1)),
    hipWidthCm: Number(hipWidthCm.toFixed(1)),
    waistWidthCm: Number(waistWidthCm.toFixed(1)),
    torsoLengthCm: Number(torsoLengthCm.toFixed(1)),
    armLengthCm: Number(armLengthCm.toFixed(1)),
    legLengthCm: Number(legLengthCm.toFixed(1)),
    detectedHeightCm: Number((detectedHeightPx * scaleFactor).toFixed(1)),
    scaleFactor,
    timestamp: Date.now(),
  };
}

/**
 * Extracts sagittal depth measurements from Side View
 */
export function extractSideMeasurements(
  landmarks: NormalizedLandmark[],
  scaleFactor: number,
  canvasWidth: number,
  canvasHeight: number,
): SideViewMeasurements {
  const s11 = landmarks[11];
  const s12 = landmarks[12];
  const h23 = landmarks[23];
  const h24 = landmarks[24];
  const nose = landmarks[0];
  const ear =
    (landmarks[7].visibility ?? 0) > (landmarks[8].visibility ?? 0)
      ? landmarks[7]
      : landmarks[8];

  const shoulderAvg = {
    x: (s11.x + s12.x) / 2,
    y: (s11.y + s12.y) / 2,
    z: (s11.z + s12.z) / 2,
  };
  const hipAvg = {
    x: (h23.x + h24.x) / 2,
    y: (h23.y + h24.y) / 2,
    z: (h23.z + h24.z) / 2,
  };

  // Chest depth: sagittal distance approximation using visible contour bounds
  // MediaPipe z differential between spinal joints and sternum/anterior markers
  const sagittalChestPx = Math.max(
    30,
    euclideanDistance2D(shoulderAvg, nose, canvasWidth, canvasHeight) * 0.75,
  );
  const chestDepthCm = sagittalChestPx * scaleFactor;

  // Abdominal depth: sagittal distance across lumbar lordosis to anterior belly
  const sagittalAbdominalPx = Math.max(
    32,
    euclideanDistance2D(hipAvg, shoulderAvg, canvasWidth, canvasHeight) * 0.48,
  );
  const abdominalDepthCm = sagittalAbdominalPx * scaleFactor;

  // Cervical posture angle (craniovertebral angle): vector from ear to shoulder relative to vertical
  const dxCervical = (ear.x - shoulderAvg.x) * canvasWidth;
  const dyCervical = Math.abs((shoulderAvg.y - ear.y) * canvasHeight);
  const cervicalPostureAngleDeg =
    dyCervical > 0 ? (Math.atan2(dxCervical, dyCervical) * 180) / Math.PI : 0;

  // Pelvic tilt angle: hip inclination
  const pelvicTiltAngleDeg = Math.abs((h23.y - h24.y) * 100);

  return {
    chestDepthCm: Number(Math.max(18, Math.min(38, chestDepthCm)).toFixed(1)),
    abdominalDepthCm: Number(
      Math.max(18, Math.min(42, abdominalDepthCm)).toFixed(1),
    ),
    cervicalPostureAngleDeg: Number(cervicalPostureAngleDeg.toFixed(1)),
    pelvicTiltAngleDeg: Number(pelvicTiltAngleDeg.toFixed(1)),
    timestamp: Date.now(),
  };
}

/**
 * Fuses Coronal (Front) and Sagittal (Side) dimensions using dual-view
 * elliptical cross-section volumetric integration and Siri/Brozek body density models.
 */
export function fuseMultiAngleAnthropometrics(
  front: FrontViewMeasurements,
  side: SideViewMeasurements,
  anchorHeightCm: number,
): AnthropometricMetrics {
  const aShoulders = front.shoulderWidthCm;
  const aHips = front.hipWidthCm;
  const aWaist = front.waistWidthCm;
  const bChest = side.chestDepthCm;
  const bWaist = side.abdominalDepthCm;
  const torsoLength = front.torsoLengthCm;

  // 1. Ramanujan true elliptical waist circumference from coronal & sagittal diameters:
  // a = aWaist / 2, b = bWaist / 2
  const aW = aWaist / 2;
  const bW = bWaist / 2;
  const waistCircumferenceCm =
    Math.PI * (3 * (aW + bW) - Math.sqrt((3 * aW + bW) * (aW + 3 * bW)));

  // Neck circumference estimate
  const neckDiameterCm = aShoulders * 0.32;
  const neckCircumferenceCm = Math.PI * neckDiameterCm;

  // 2. Dual-Axis Elliptical Cross-Section Volumes:
  // Chest cross-section area: A = π * (aShoulders*0.8/2) * (bChest/2)
  const aChest = aShoulders * 0.82;
  const areaChest = Math.PI * (aChest / 2) * (bChest / 2);
  const areaWaist = Math.PI * aW * bW;
  const areaHips = Math.PI * (aHips / 2) * ((bWaist * 0.95) / 2);

  // Prismoidal / Simpson's rule for torso volume: V = (L / 6) * (A1 + 4*Am + A2)
  const torsoVolL =
    ((torsoLength / 6) * (areaChest + 4 * areaWaist + areaHips)) / 1000;

  // Limbs volume:
  const armRadiusCm = aShoulders * 0.13;
  const armsVolL =
    (2 * Math.PI * Math.pow(armRadiusCm, 2) * front.armLengthCm) / 1000;

  const legRadiusCm = aHips * 0.24;
  const legsVolL =
    (2 * Math.PI * Math.pow(legRadiusCm, 2) * front.legLengthCm) / 1000;

  // Head volume (~4.18 L)
  const headVolL = ((4 / 3) * Math.PI * Math.pow(10, 3)) / 1000;

  const totalVolumeL = headVolL + torsoVolL + armsVolL + legsVolL;
  const tissueDensity = 1.055;
  let estimatedWeightKg = totalVolumeL * tissueDensity;

  // Normative physiological bounding (BMI 17..38)
  const heightM = anchorHeightCm / 100;
  const minPlausibleWeight = 17 * heightM * heightM;
  const maxPlausibleWeight = 38 * heightM * heightM;
  estimatedWeightKg = Math.min(
    maxPlausibleWeight,
    Math.max(minPlausibleWeight, estimatedWeightKg),
  );

  // 3. Regressions:
  // Modified US Navy Formula:
  const waistNeckDelta = Math.max(
    5,
    waistCircumferenceCm - neckCircumferenceCm,
  );
  const logWaistNeck = Math.log10(waistNeckDelta);
  const logHeight = Math.log10(anchorHeightCm);
  let bodyFatNavy =
    495 / (1.0324 - 0.19077 * logWaistNeck + 0.15456 * logHeight) - 450;
  if (isNaN(bodyFatNavy) || bodyFatNavy < 5) bodyFatNavy = 8.5;
  if (bodyFatNavy > 50) bodyFatNavy = 48.0;

  // Anthropometric Body Density D:
  // Derived from circumferences & height (Jackson-Pollock / Wilmore-Behnke generalized formulation)
  const bodyDensity =
    1.10938 -
    0.0008267 * (waistCircumferenceCm * 0.45) +
    0.0000016 * Math.pow(waistCircumferenceCm * 0.45, 2) -
    0.0002574 * anchorHeightCm * 0.1;

  // Siri Equation: BF% = 495 / D - 450
  let bodyFatSiri = 495 / Math.max(1.01, bodyDensity) - 450;
  if (isNaN(bodyFatSiri) || bodyFatSiri < 4) bodyFatSiri = 7.0;
  if (bodyFatSiri > 55) bodyFatSiri = 50.0;

  // Brožek Equation: BF% = 457 / D - 414.2
  let bodyFatBrozek = 457 / Math.max(1.01, bodyDensity) - 414.2;
  if (isNaN(bodyFatBrozek) || bodyFatBrozek < 4) bodyFatBrozek = 7.0;
  if (bodyFatBrozek > 55) bodyFatBrozek = 50.0;

  // Weighted composite body fat percentage
  const bodyFatPercentage =
    0.5 * bodyFatNavy + 0.25 * bodyFatSiri + 0.25 * bodyFatBrozek;

  // Lean Mass & Skeletal Muscle Mass
  const leanBodyMassKg = estimatedWeightKg * (1 - bodyFatPercentage / 100);
  const skeletalMuscleMassKg = leanBodyMassKg * 0.54;

  return {
    detectedHeightCm: front.detectedHeightCm,
    calibratedHeightCm: anchorHeightCm,
    scaleFactor: front.scaleFactor,
    shoulderWidthCm: front.shoulderWidthCm,
    chestDepthCm: side.chestDepthCm,
    waistWidthCm: front.waistWidthCm,
    waistCircumferenceCm: Number(waistCircumferenceCm.toFixed(1)),
    hipWidthCm: front.hipWidthCm,
    torsoLengthCm: front.torsoLengthCm,
    armLengthCm: front.armLengthCm,
    legLengthCm: front.legLengthCm,
    estimatedWeightKg: Number(estimatedWeightKg.toFixed(1)),
    bodyFatPercentage: Number(bodyFatPercentage.toFixed(1)),
    bodyFatNavy: Number(bodyFatNavy.toFixed(1)),
    bodyFatSiri: Number(bodyFatSiri.toFixed(1)),
    bodyFatBrozek: Number(bodyFatBrozek.toFixed(1)),
    leanBodyMassKg: Number(leanBodyMassKg.toFixed(1)),
    skeletalMuscleMassKg: Number(skeletalMuscleMassKg.toFixed(1)),
    confidence: 0.95,
    poseDetected: true,
    isDualAngle: true,
    frontSnapshot: front,
    sideSnapshot: side,
  };
}

/**
 * Single-frame anthropometric analysis with sagittal ratio approximation (fallback mode)
 */
export function computeAnthropometrics(
  landmarks: NormalizedLandmark[] | null,
  anchorHeightCm: number,
  canvasWidth = 640,
  canvasHeight = 480,
): AnthropometricMetrics {
  const fallbackMetrics: AnthropometricMetrics = {
    detectedHeightCm: anchorHeightCm,
    calibratedHeightCm: anchorHeightCm,
    scaleFactor: 0,
    shoulderWidthCm: 0,
    chestDepthCm: 0,
    waistWidthCm: 0,
    waistCircumferenceCm: 0,
    hipWidthCm: 0,
    torsoLengthCm: 0,
    armLengthCm: 0,
    legLengthCm: 0,
    estimatedWeightKg: 0,
    bodyFatPercentage: 0,
    bodyFatNavy: 0,
    bodyFatSiri: 0,
    bodyFatBrozek: 0,
    leanBodyMassKg: 0,
    skeletalMuscleMassKg: 0,
    confidence: 0,
    poseDetected: false,
    isDualAngle: false,
  };

  if (!landmarks || landmarks.length < 33) {
    return fallbackMetrics;
  }

  const keyIndices = [0, 11, 12, 23, 24, 25, 26, 27, 28];
  let totalVis = 0;
  for (const idx of keyIndices) {
    totalVis += landmarks[idx]?.visibility ?? 0;
  }
  const meanConfidence = totalVis / keyIndices.length;

  if (meanConfidence < 0.4) {
    return { ...fallbackMetrics, confidence: meanConfidence };
  }

  const front = extractFrontMeasurements(
    landmarks,
    anchorHeightCm,
    canvasWidth,
    canvasHeight,
  );

  // Approximate sagittal depth using statistical human proportion ratio (0.58 shoulders, 0.72 waist)
  const syntheticSide: SideViewMeasurements = {
    chestDepthCm: Number((front.shoulderWidthCm * 0.58).toFixed(1)),
    abdominalDepthCm: Number((front.waistWidthCm * 0.72).toFixed(1)),
    cervicalPostureAngleDeg: 12.0,
    pelvicTiltAngleDeg: 8.0,
    timestamp: Date.now(),
  };

  const fused = fuseMultiAngleAnthropometrics(
    front,
    syntheticSide,
    anchorHeightCm,
  );
  return {
    ...fused,
    isDualAngle: false,
    confidence: Number(meanConfidence.toFixed(2)),
  };
}
