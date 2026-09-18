import type {
  NormalizedLandmark,
  AnthropometricMetrics,
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
 * Core anthropometric analysis engine
 * Pure, deterministic function decoupled from UI state.
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
    leanBodyMassKg: 0,
    skeletalMuscleMassKg: 0,
    confidence: 0,
    poseDetected: false,
  };

  if (!landmarks || landmarks.length < 33) {
    return fallbackMetrics;
  }

  // Verify key landmark confidence
  const keyIndices = [0, 11, 12, 23, 24, 25, 26, 27, 28];
  let totalVis = 0;
  for (const idx of keyIndices) {
    totalVis += landmarks[idx]?.visibility ?? 0;
  }
  const meanConfidence = totalVis / keyIndices.length;

  if (meanConfidence < 0.4) {
    return { ...fallbackMetrics, confidence: meanConfidence };
  }

  // 1. Calculate optical scale
  const { scaleFactor, detectedHeightPx } = computeOpticalScale(
    landmarks,
    anchorHeightCm,
    canvasWidth,
    canvasHeight,
  );

  if (scaleFactor <= 0) {
    return { ...fallbackMetrics, confidence: meanConfidence };
  }

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

  // 2. Biacromial Diameter (Shoulder Span)
  const shoulderSpanPx = euclideanDistance2D(
    s11,
    s12,
    canvasWidth,
    canvasHeight,
  );
  const shoulderWidthCm = shoulderSpanPx * scaleFactor;

  // 3. Bi-iliac Diameter (Pelvic / Hip Span)
  const hipSpanPx = euclideanDistance2D(h23, h24, canvasWidth, canvasHeight);
  const hipWidthCm = hipSpanPx * scaleFactor;

  // 4. Torso Length (Shoulder midpoint to Hip midpoint)
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

  // 5. Limb Segment Lengths
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

  // 6. Waist and Chest Proxies
  // Standard anthropometric waist taper factor: between 0.70 and 0.85 of shoulder width
  const waistWidthCm = Math.max(20, shoulderWidthCm * 0.45 + hipWidthCm * 0.5);
  // Sagittal anteroposterior depth approximation
  const sagittalRatio = 0.72; // depth-to-width ratio for human abdomen
  const waistDepthCm = waistWidthCm * sagittalRatio;
  // Ramanujan's formula for ellipse circumference: C ≈ π * [3(a+b) - √((3a+b)(a+3b))]
  const aW = waistWidthCm / 2;
  const bW = waistDepthCm / 2;
  const waistCircumferenceCm =
    Math.PI * (3 * (aW + bW) - Math.sqrt((3 * aW + bW) * (aW + 3 * bW)));

  // Chest Depth Proxy
  const chestDepthCm = shoulderWidthCm * 0.58;

  // Neck circumference estimate (~0.33 of shoulder width)
  const neckDiameterCm = shoulderWidthCm * 0.32;
  const neckCircumferenceCm = Math.PI * neckDiameterCm;

  // 7. Modified US Navy Body Fat % Regression
  // Navy formula for men: 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
  const waistNeckDelta = Math.max(
    5,
    waistCircumferenceCm - neckCircumferenceCm,
  );
  const logWaistNeck = Math.log10(waistNeckDelta);
  const logHeight = Math.log10(anchorHeightCm);

  let bodyFatPercentage =
    495 / (1.0324 - 0.19077 * logWaistNeck + 0.15456 * logHeight) - 450;

  // Biological sanity clamp
  if (isNaN(bodyFatPercentage) || bodyFatPercentage < 5)
    bodyFatPercentage = 8.5;
  if (bodyFatPercentage > 50) bodyFatPercentage = 48.0;

  // 8. Volumetric Segment Summation for Total Body Mass (Weight)
  // Human tissue average density: ~1.055 g/cm³
  const tissueDensityKgPerL = 1.055;

  // Cylindrical/Ellipsoidal Segment volumes (in Liters, dm³)
  // Head volume: ellipsoid 4/3 * π * r1 * r2 * r3 (~4.18 L)
  const headRadiusCm = 10;
  const headVolL = ((4 / 3) * Math.PI * Math.pow(headRadiusCm, 3)) / 1000;

  // Torso volume: elliptical cylinder π * a * b * h
  const torsoRadiusA = shoulderWidthCm * 0.44;
  const torsoRadiusB = chestDepthCm * 0.45;
  const torsoVolL =
    (Math.PI * torsoRadiusA * torsoRadiusB * torsoLengthCm) / 1000;

  // Arms volume (both arms as frustum cylinders)
  const armRadiusCm = shoulderWidthCm * 0.13;
  const armsVolL =
    (2 * Math.PI * Math.pow(armRadiusCm, 2) * armLengthCm) / 1000;

  // Legs volume (both legs as frustum cylinders)
  const legRadiusCm = hipWidthCm * 0.24;
  const legsVolL =
    (2 * Math.PI * Math.pow(legRadiusCm, 2) * legLengthCm) / 1000;

  // Total volumetric body mass
  const totalVolumeL = headVolL + torsoVolL + armsVolL + legsVolL;
  let estimatedWeightKg = totalVolumeL * tissueDensityKgPerL;

  // Calibration against normative BMI bounds for standing height
  // Ensure weight is within plausible human range for height (BMI 17 - 38)
  const heightM = anchorHeightCm / 100;
  const minPlausibleWeight = 17 * heightM * heightM;
  const maxPlausibleWeight = 38 * heightM * heightM;
  estimatedWeightKg = Math.min(
    maxPlausibleWeight,
    Math.max(minPlausibleWeight, estimatedWeightKg),
  );

  // 9. Lean Body Mass (LBM) & Skeletal Muscle Mass (SMM)
  const leanBodyMassKg = estimatedWeightKg * (1 - bodyFatPercentage / 100);
  // Janssen et al. bio-anthropometric regression: SMM ≈ 0.54 * LBM
  const skeletalMuscleMassKg = leanBodyMassKg * 0.54;

  return {
    detectedHeightCm: detectedHeightPx * scaleFactor,
    calibratedHeightCm: anchorHeightCm,
    scaleFactor,
    shoulderWidthCm: Number(shoulderWidthCm.toFixed(1)),
    chestDepthCm: Number(chestDepthCm.toFixed(1)),
    waistWidthCm: Number(waistWidthCm.toFixed(1)),
    waistCircumferenceCm: Number(waistCircumferenceCm.toFixed(1)),
    hipWidthCm: Number(hipWidthCm.toFixed(1)),
    torsoLengthCm: Number(torsoLengthCm.toFixed(1)),
    armLengthCm: Number(armLengthCm.toFixed(1)),
    legLengthCm: Number(legLengthCm.toFixed(1)),
    estimatedWeightKg: Number(estimatedWeightKg.toFixed(1)),
    bodyFatPercentage: Number(bodyFatPercentage.toFixed(1)),
    leanBodyMassKg: Number(leanBodyMassKg.toFixed(1)),
    skeletalMuscleMassKg: Number(skeletalMuscleMassKg.toFixed(1)),
    confidence: Number(meanConfidence.toFixed(2)),
    poseDetected: true,
  };
}
