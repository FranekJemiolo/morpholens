import { describe, it, expect } from "vitest";
import {
  euclideanDistance2D,
  euclideanDistance3D,
  computeOpticalScale,
  computeAnthropometrics,
} from "../../src/lib/anthropometrics.ts";
import { generateSyntheticPose } from "../../src/services/poseLandmarker.ts";
import type { NormalizedLandmark } from "../../src/types/vision.ts";

describe("Anthropometrics Math & Regression Engine", () => {
  describe("Euclidean Distance Utilities", () => {
    it("calculates accurate 2D pixel distance between normalized coordinates", () => {
      const p1: NormalizedLandmark = { x: 0.2, y: 0.3, z: 0 };
      const p2: NormalizedLandmark = { x: 0.5, y: 0.7, z: 0 };
      const width = 1000;
      const height = 1000;

      // dx = 300, dy = 400 => hypotenuse = 500
      const dist = euclideanDistance2D(p1, p2, width, height);
      expect(dist).toBeCloseTo(500, 1);
    });

    it("calculates accurate 3D Euclidean distance incorporating depth", () => {
      const p1: NormalizedLandmark = { x: 0.0, y: 0.0, z: 0.0 };
      const p2: NormalizedLandmark = { x: 0.1, y: 0.2, z: 0.2 };
      const width = 1000;
      const height = 1000;

      // dx = 100, dy = 200, dz = 200 => sqrt(10000 + 40000 + 40000) = 300
      const dist = euclideanDistance3D(p1, p2, width, height);
      expect(dist).toBeCloseTo(300, 1);
    });
  });

  describe("Optical Scale Computation", () => {
    it("derives correct cm/pixel scale factor for standard stature", () => {
      const pose = generateSyntheticPose(0);
      const anchorHeightCm = 180;
      const { scaleFactor, detectedHeightPx } = computeOpticalScale(
        pose,
        anchorHeightCm,
        640,
        480,
      );

      expect(detectedHeightPx).toBeGreaterThan(200);
      expect(scaleFactor).toBeGreaterThan(0.2);
      expect(scaleFactor).toBeLessThan(1.0);
      // Scaled stature should match anchor height
      expect(detectedHeightPx * scaleFactor).toBeCloseTo(anchorHeightCm, 1);
    });

    it("handles edge cases with missing or incomplete landmarks defensively", () => {
      const emptyScale = computeOpticalScale([], 175, 640, 480);
      expect(emptyScale.scaleFactor).toBe(0);
      expect(emptyScale.detectedHeightPx).toBe(0);

      // Incomplete landmark array (< 33)
      const partialPose = generateSyntheticPose(0).slice(0, 10);
      const partialScale = computeOpticalScale(partialPose, 175, 640, 480);
      expect(partialScale.scaleFactor).toBe(0);
    });
  });

  describe("Anthropometric Telemetry & Regression Analysis", () => {
    it("computes physiologically plausible body composition for standard synthetic pose", () => {
      const anchorHeightCm = 178;
      const pose = generateSyntheticPose(0);
      const metrics = computeAnthropometrics(pose, anchorHeightCm, 640, 480);

      expect(metrics.poseDetected).toBe(true);
      expect(metrics.calibratedHeightCm).toBe(178);

      // Biacromial shoulder span typically ~36-48 cm for adult human
      expect(metrics.shoulderWidthCm).toBeGreaterThan(32);
      expect(metrics.shoulderWidthCm).toBeLessThan(55);

      // Bi-iliac pelvic span typically ~28-40 cm
      expect(metrics.hipWidthCm).toBeGreaterThan(24);
      expect(metrics.hipWidthCm).toBeLessThan(46);

      // Plausible human weight for 178 cm height (55kg - 95kg)
      expect(metrics.estimatedWeightKg).toBeGreaterThan(55);
      expect(metrics.estimatedWeightKg).toBeLessThan(95);

      // Plausible body fat % for standard synthetic mannequin
      expect(metrics.bodyFatPercentage).toBeGreaterThan(6);
      expect(metrics.bodyFatPercentage).toBeLessThan(35);

      // Conservation of mass: Lean Mass + Fat Mass ≈ Total Weight
      const computedTotal =
        metrics.leanBodyMassKg +
        (metrics.estimatedWeightKg * metrics.bodyFatPercentage) / 100;
      expect(computedTotal).toBeCloseTo(metrics.estimatedWeightKg, 0);

      // Skeletal Muscle Mass should be ~54% of Lean Body Mass
      expect(
        Math.abs(metrics.skeletalMuscleMassKg - metrics.leanBodyMassKg * 0.54),
      ).toBeLessThan(0.1);
    });

    it("sensitively reflects changes in waist proportion on Body Fat %", () => {
      const anchorHeightCm = 175;
      const normalPose = generateSyntheticPose(0, 1.0);
      const widerPose = generateSyntheticPose(0, 1.35); // wider torso & waist

      const normalMetrics = computeAnthropometrics(
        normalPose,
        anchorHeightCm,
        640,
        480,
      );
      const widerMetrics = computeAnthropometrics(
        widerPose,
        anchorHeightCm,
        640,
        480,
      );

      expect(widerMetrics.shoulderWidthCm).toBeGreaterThan(
        normalMetrics.shoulderWidthCm,
      );
      expect(widerMetrics.waistCircumferenceCm).toBeGreaterThan(
        normalMetrics.waistCircumferenceCm,
      );
      // Increased waist circumference relative to stature increases body fat % in Navy regression
      expect(widerMetrics.bodyFatPercentage).toBeGreaterThan(
        normalMetrics.bodyFatPercentage,
      );
      // Wider volumetric segments increase estimated mass
      expect(widerMetrics.estimatedWeightKg).toBeGreaterThan(
        normalMetrics.estimatedWeightKg,
      );
    });

    it("gracefully returns fallback metrics when landmark confidence is low", () => {
      const lowConfidencePose: NormalizedLandmark[] = Array.from(
        { length: 33 },
        () => ({
          x: 0.5,
          y: 0.5,
          z: 0.0,
          visibility: 0.1, // very low visibility
        }),
      );

      const metrics = computeAnthropometrics(lowConfidencePose, 175, 640, 480);
      expect(metrics.poseDetected).toBe(false);
      expect(metrics.estimatedWeightKg).toBe(0);
      expect(metrics.confidence).toBeLessThan(0.4);
    });
  });
});
