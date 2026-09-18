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
  const lKnee = landmarks[25];
  const rKnee = landmarks[26];
  const lHip = landmarks[23];
  const rHip = landmarks[24];

  if (!nose || !lShoulder || !rShoulder) {
    return { scaleFactor: 0, detectedHeightPx: 0 };
  }

  // Cranial apex estimation (top of head above nose)
  const shoulderMidY = ((lShoulder.y + rShoulder.y) / 2) * canvasHeight;
  const noseY = nose.y * canvasHeight;
  const headHeightPx = Math.max(20, (shoulderMidY - noseY) * 1.6);
  const cranialApexY = Math.max(0, noseY - headHeightPx * 0.75);

  // If head is cut off above top of frame (nose is close to top or cranialApex clamped)
  const isHeadTruncated = nose.y < 0.05 || cranialApexY <= 0;

  // Check if feet are visible and not cut off by frame bottom
  const lAnkleVis = lAnkle?.visibility ?? 0.8;
  const rAnkleVis = rAnkle?.visibility ?? 0.8;
  const ankleY1 = (lHeel?.y ?? lAnkle?.y ?? 1) * canvasHeight;
  const ankleY2 = (rHeel?.y ?? rAnkle?.y ?? 1) * canvasHeight;
  const rawFloorY = (ankleY1 + ankleY2) / 2;

  const isFeetTruncated =
    !lAnkle ||
    !rAnkle ||
    (lAnkleVis < 0.4 && rAnkleVis < 0.4) ||
    Math.max(lAnkle?.y ?? 1, rAnkle?.y ?? 1) > 0.97;

  let detectedHeightPx: number;

  if (isFeetTruncated && lKnee && rKnee && (lKnee.visibility ?? 0.8) > 0.4) {
    // Knees are visible: Winter's allometric ratio — Vertex to Knee is ~71.5% of stature
    const kneeMidY = ((lKnee.y + rKnee.y) / 2) * canvasHeight;
    const vertexToKneePx = Math.max(50, kneeMidY - cranialApexY);
    detectedHeightPx = vertexToKneePx / 0.715;
  } else if (isFeetTruncated && lHip && rHip && (lHip.visibility ?? 0.8) > 0.4) {
    // Hips are visible: Vertex to Greater Trochanter is ~47% of stature
    const hipMidY = ((lHip.y + rHip.y) / 2) * canvasHeight;
    const vertexToHipPx = Math.max(30, hipMidY - cranialApexY);
    detectedHeightPx = vertexToHipPx / 0.47;
  } else {
    // Standard full-body floor baseline
    const floorBaselineY = rawFloorY;
    if (isHeadTruncated && !isFeetTruncated) {
      // Head cut off: Floor to Shoulder Mid is ~81.8% of stature
      const shoulderToFloorPx = Math.max(50, floorBaselineY - shoulderMidY);
      detectedHeightPx = shoulderToFloorPx / 0.818;
    } else {
      detectedHeightPx = Math.max(1, floorBaselineY - cranialApexY);
    }
  }

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
 * Automatically detects biological sex morphology from skeletal proportions.
 * Uses biacromial (shoulder) to bi-iliac (pelvic) ratio (R_sh).
 * Adult males characteristically exhibit R_sh >= 1.30 (V-taper).
 * Adult females characteristically exhibit R_sh < 1.30 (gynoid/hourglass pelvic width).
 */
export function detectBiologicalSex(
  landmarks: NormalizedLandmark[] | null,
): "male" | "female" {
  if (!landmarks || landmarks.length < 33) return "male";
  const s11 = landmarks[11];
  const s12 = landmarks[12];
  const h23 = landmarks[23];
  const h24 = landmarks[24];
  if (!s11 || !s12 || !h23 || !h24) return "male";

  const shoulderDx = Math.abs(s11.x - s12.x);
  const hipDx = Math.abs(h23.x - h24.x);
  if (hipDx <= 0.001) return "male";

  const ratio = shoulderDx / hipDx;
  return ratio < 1.3 ? "female" : "male";
}

/**
 * Fuses Coronal (Front) and Sagittal (Side) dimensions using dual-view
 * elliptical cross-section volumetric integration and Siri/Brozek body density models.
 */
export function fuseMultiAngleAnthropometrics(
  front: FrontViewMeasurements,
  side: SideViewMeasurements,
  anchorHeightCm: number,
  biologicalSex: "male" | "female" = "male",
): AnthropometricMetrics {
  const isFemale = biologicalSex === "female";

  // Anatomical soft-tissue expansion factors from internal skeletal joint distances:
  const outerShoulderWidthCm = front.shoulderWidthCm * (isFemale ? 1.12 : 1.16);
  const outerHipWidthCm = front.hipWidthCm * (isFemale ? 1.25 : 1.18);
  const outerWaistWidthCm = front.waistWidthCm * (isFemale ? 1.12 : 1.16);

  // Sagittal depths (chest & abdominal):
  const outerChestDepthCm = side.chestDepthCm * (isFemale ? 1.04 : 1.08);
  const outerAbdominalDepthCm = side.abdominalDepthCm * (isFemale ? 1.04 : 1.08);
  const outerHipDepthCm = side.abdominalDepthCm * (isFemale ? 1.14 : 1.08);

  // 1. Ramanujan true elliptical circumferences:
  // Waist circumference:
  const aW = outerWaistWidthCm / 2;
  const bW = outerAbdominalDepthCm / 2;
  const waistCircumferenceCm =
    Math.PI * (3 * (aW + bW) - Math.sqrt((3 * aW + bW) * (aW + 3 * bW)));

  // Hip circumference:
  const aH = outerHipWidthCm / 2;
  const bH = outerHipDepthCm / 2;
  const hipCircumferenceCm =
    Math.PI * (3 * (aH + bH) - Math.sqrt((3 * aH + bH) * (aH + 3 * bH)));

  // Neck circumference estimate:
  const neckDiameterCm = outerShoulderWidthCm * (isFemale ? 0.25 : 0.28);
  const neckCircumferenceCm = Math.PI * neckDiameterCm;

  // 2. Multi-Segment Volumetric Integration:
  // A. Torso / Trunk:
  // Effective trunk length from clavicular notch down to perineal floor:
  const trunkLengthCm = front.torsoLengthCm * 1.18;
  const aChest = outerShoulderWidthCm * (isFemale ? 0.82 : 0.88);
  const areaChest = Math.PI * (aChest / 2) * (outerChestDepthCm / 2);
  const areaWaist = Math.PI * aW * bW;
  const areaHips = Math.PI * aH * bH;

  // Simpson's prismoidal rule for torso volume:
  const torsoVolL =
    ((trunkLengthCm / 6) * (areaChest + 4 * areaWaist + areaHips)) / 1000;

  // B. Arms (Dual Conical Frustums from shoulder to wrist):
  const rArmProx = outerShoulderWidthCm * 0.125;
  const rArmDist = outerShoulderWidthCm * 0.075;
  const armVolL =
    (Math.PI *
      front.armLengthCm *
      (Math.pow(rArmProx, 2) + rArmProx * rArmDist + Math.pow(rArmDist, 2))) /
    3 /
    1000;
  const armsVolL = 2 * armVolL;

  // C. Legs (Dual Conical Frustums for thigh & shank):
  const rThigh = outerHipWidthCm * (isFemale ? 0.26 : 0.24);
  const rKnee = outerHipWidthCm * 0.165;
  const rAnkle = outerHipWidthCm * 0.105;
  const thighLength = front.legLengthCm * 0.52;
  const shankLength = front.legLengthCm * 0.48;
  const thighVolL =
    (Math.PI *
      thighLength *
      (Math.pow(rThigh, 2) + rThigh * rKnee + Math.pow(rKnee, 2))) /
    3 /
    1000;
  const shankVolL =
    (Math.PI *
      shankLength *
      (Math.pow(rKnee, 2) + rKnee * rAnkle + Math.pow(rAnkle, 2))) /
    3 /
    1000;
  const legsVolL = 2 * (thighVolL + shankVolL);

  // D. Cranial & Cervical volume:
  const headVolL = isFemale ? 4.4 : 5.0;

  const totalVolumeL = headVolL + torsoVolL + armsVolL + legsVolL;

  // Mean tissue density (kg/L): slightly higher in males due to bone mineral and muscle density
  const tissueDensity = isFemale ? 1.045 : 1.055;
  let estimatedWeightKg = totalVolumeL * tissueDensity;

  // Normative physiological bounding: allows BMI 16.5 up to 42.0 (broad athlete/robust frame)
  const heightM = anchorHeightCm / 100;
  const minPlausibleWeight = 16.5 * heightM * heightM;
  const maxPlausibleWeight = 42.0 * heightM * heightM;
  estimatedWeightKg = Math.min(
    maxPlausibleWeight,
    Math.max(minPlausibleWeight, estimatedWeightKg),
  );

  const bmi = estimatedWeightKg / (heightM * heightM);

  // 3. Regressions for Body Fat Percentage:
  const logHeight = Math.log10(anchorHeightCm);
  let bodyFatNavy = 15.0;

  if (isFemale) {
    // US Navy Formula for Females:
    const deltaFemale = Math.max(
      5,
      waistCircumferenceCm + hipCircumferenceCm - neckCircumferenceCm,
    );
    const logDeltaFemale = Math.log10(deltaFemale);
    bodyFatNavy =
      495 / (1.29579 - 0.35004 * logDeltaFemale + 0.221 * logHeight) - 450;
    if (isNaN(bodyFatNavy) || bodyFatNavy < 10) bodyFatNavy = 18.0;
    if (bodyFatNavy > 55) bodyFatNavy = 50.0;
  } else {
    // US Navy Formula for Males:
    const deltaMale = Math.max(5, waistCircumferenceCm - neckCircumferenceCm);
    const logDeltaMale = Math.log10(deltaMale);
    bodyFatNavy =
      495 / (1.0324 - 0.19077 * logDeltaMale + 0.15456 * logHeight) - 450;
    if (isNaN(bodyFatNavy) || bodyFatNavy < 4) bodyFatNavy = 8.5;
    if (bodyFatNavy > 50) bodyFatNavy = 48.0;
  }

  // Anthropometric Body Density D:
  const bodyDensity = isFemale
    ? 1.0994921 -
      0.0009929 * (waistCircumferenceCm * 0.45) +
      0.0000023 * Math.pow(waistCircumferenceCm * 0.45, 2) -
      0.0001392 * anchorHeightCm * 0.1
    : 1.10938 -
      0.0008267 * (waistCircumferenceCm * 0.45) +
      0.0000016 * Math.pow(waistCircumferenceCm * 0.45, 2) -
      0.0002574 * anchorHeightCm * 0.1;

  // Siri Equation: BF% = 495 / D - 450
  let bodyFatSiri = 495 / Math.max(1.01, bodyDensity) - 450;
  if (isNaN(bodyFatSiri) || bodyFatSiri < (isFemale ? 8 : 4))
    bodyFatSiri = isFemale ? 18.0 : 8.0;
  if (bodyFatSiri > 55) bodyFatSiri = 50.0;

  // Brožek Equation: BF% = 457 / D - 414.2
  let bodyFatBrozek = 457 / Math.max(1.01, bodyDensity) - 414.2;
  if (isNaN(bodyFatBrozek) || bodyFatBrozek < (isFemale ? 8 : 4))
    bodyFatBrozek = isFemale ? 17.5 : 8.0;
  if (bodyFatBrozek > 55) bodyFatBrozek = 50.0;

  // Weighted composite body fat percentage
  const bodyFatPercentage =
    0.5 * bodyFatNavy + 0.25 * bodyFatSiri + 0.25 * bodyFatBrozek;

  // Lean Mass & Skeletal Muscle Mass
  const leanBodyMassKg = estimatedWeightKg * (1 - bodyFatPercentage / 100);
  const skeletalMuscleMassKg = leanBodyMassKg * (isFemale ? 0.48 : 0.54);

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
    biologicalSex,
    bmi: Number(bmi.toFixed(1)),
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
  biologicalSex: "male" | "female" = "male",
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
    biologicalSex,
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

  const isFemale = biologicalSex === "female";

  // Approximate sagittal depth using statistical human proportion ratios
  const syntheticSide: SideViewMeasurements = {
    chestDepthCm: Number(
      (front.shoulderWidthCm * (isFemale ? 0.6 : 0.66)).toFixed(1),
    ),
    abdominalDepthCm: Number(
      (front.waistWidthCm * (isFemale ? 0.76 : 0.8)).toFixed(1),
    ),
    cervicalPostureAngleDeg: 12.0,
    pelvicTiltAngleDeg: 8.0,
    timestamp: Date.now(),
  };

  const fused = fuseMultiAngleAnthropometrics(
    front,
    syntheticSide,
    anchorHeightCm,
    biologicalSex,
  );
  return {
    ...fused,
    isDualAngle: false,
    confidence: Number(meanConfidence.toFixed(2)),
  };
}
