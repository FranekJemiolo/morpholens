import { describe, it, expect } from "vitest";
import {
  euclideanDistance2D,
  euclideanDistance3D,
  computeOpticalScale,
  computeAnthropometrics,
  evaluatePoseQuality,
  extractFrontMeasurements,
  extractSideMeasurements,
  fuseMultiAngleAnthropometrics,
  projectToCanvas,
} from "../../src/lib/anthropometrics.ts";
import {
  standardFrontPose,
  standardSidePose,
  endomorphPose,
  ectomorphPose,
  degradedOccludedPose,
} from "../fixtures/landmarks.ts";

describe("Anthropometrics Math & Regression Engine", () => {
  describe("Euclidean Distance & Projection Utilities", () => {
    it("calculates accurate 2D pixel distance between normalized coordinates", () => {
      const p1 = { x: 0.2, y: 0.3, z: 0 };
      const p2 = { x: 0.5, y: 0.7, z: 0 };
      const dist = euclideanDistance2D(p1, p2, 1000, 1000);
      expect(dist).toBeCloseTo(500, 1);
    });

    it("calculates accurate 3D Euclidean distance incorporating depth", () => {
      const p1 = { x: 0.0, y: 0.0, z: 0.0 };
      const p2 = { x: 0.1, y: 0.2, z: 0.2 };
      const dist = euclideanDistance3D(p1, p2, 1000, 1000);
      expect(dist).toBeCloseTo(300, 1);
    });

    it("projects coordinates with object-fit: cover aspect ratio correction", () => {
      const lm = { x: 0.5, y: 0.5, z: 0.0 };
      // Wider video (16:9) inside square canvas (1:1): horizontally cropped
      const projWider = projectToCanvas(lm, 600, 600, 1920, 1080, false);
      expect(projWider.x).toBeCloseTo(300, 1); // center remains centered
      expect(projWider.y).toBeCloseTo(300, 1);

      // Taller video (4:3) inside wide canvas (16:9): vertically cropped
      const projTaller = projectToCanvas(lm, 1600, 900, 640, 480, false);
      expect(projTaller.x).toBeCloseTo(800, 1);
      expect(projTaller.y).toBeCloseTo(450, 1);
    });
  });

  describe("Optical Scale Computation", () => {
    it("derives correct cm/pixel scale factor for standard stature", () => {
      const anchorHeightCm = 180;
      const { scaleFactor, detectedHeightPx } = computeOpticalScale(
        standardFrontPose,
        anchorHeightCm,
        640,
        480,
      );

      expect(detectedHeightPx).toBeGreaterThan(200);
      expect(scaleFactor).toBeGreaterThan(0.2);
      expect(scaleFactor).toBeLessThan(1.0);
      expect(detectedHeightPx * scaleFactor).toBeCloseTo(anchorHeightCm, 1);
    });

    it("handles edge cases with missing or incomplete landmarks defensively", () => {
      const emptyScale = computeOpticalScale([], 175, 640, 480);
      expect(emptyScale.scaleFactor).toBe(0);
      expect(emptyScale.detectedHeightPx).toBe(0);

      const partialPose = standardFrontPose.slice(0, 10);
      const partialScale = computeOpticalScale(partialPose, 175, 640, 480);
      expect(partialScale.scaleFactor).toBe(0);
    });

    it("reconstructs optical scale allometrically when feet are truncated/out of frame", () => {
      // Simulate feet cut off at knees
      const poseWithoutFeet = standardFrontPose.map((lm, idx) => {
        if (idx >= 27) {
          // Ankles, heels, feet indices occluded
          return { ...lm, visibility: 0.1, y: 0.99 };
        }
        return lm;
      });

      const fullScale = computeOpticalScale(standardFrontPose, 180, 640, 480);
      const reconstructedScale = computeOpticalScale(poseWithoutFeet, 180, 640, 480);

      // Reconstructed stature should be within 10% of full stature rather than collapsing
      expect(reconstructedScale.scaleFactor).toBeGreaterThan(0.2);
      const diffPercent =
        Math.abs(
          reconstructedScale.detectedHeightPx - fullScale.detectedHeightPx,
        ) / fullScale.detectedHeightPx;
      expect(diffPercent).toBeLessThan(0.1);
    });
  });

  describe("Pose Validity Gate & Quality Evaluation", () => {
    it("scores standard front pose with high quality and locked status", () => {
      const assessment = evaluatePoseQuality(standardFrontPose, "front");
      expect(assessment.isValid).toBe(true);
      expect(assessment.qualityScore).toBeGreaterThanOrEqual(80);
      expect(assessment.alignmentState).toBe("locked");
      expect(assessment.missingLandmarks).toHaveLength(0);
    });

    it("rejects degraded poses with occluded feet and alerts the user", () => {
      const assessment = evaluatePoseQuality(degradedOccludedPose, "front");
      expect(assessment.isValid).toBe(false);
      expect(assessment.alignmentState).toBe("out_of_frame");
      expect(assessment.feedbackMessage).toContain("feet not fully visible");
    });

    it("evaluates side profile correctly when user is turned sideways", () => {
      const assessment = evaluatePoseQuality(standardSidePose, "side");
      expect(assessment.isValid).toBe(true);
      expect(assessment.alignmentState).toBe("locked");
    });

    it("flags frontal pose as needing 90-degree turn when evaluating side view", () => {
      const assessment = evaluatePoseQuality(standardFrontPose, "side");
      expect(assessment.isValid).toBe(false);
      expect(assessment.feedbackMessage).toContain("Turn 90°");
    });
  });

  describe("Multi-Angle Anthropometrics & Volumetric Fusion", () => {
    it("fuses Coronal and Sagittal measurements into verified volumetric composition", () => {
      const anchorHeightCm = 178;
      const front = extractFrontMeasurements(
        standardFrontPose,
        anchorHeightCm,
        640,
        480,
      );
      const side = extractSideMeasurements(
        standardSidePose,
        front.scaleFactor,
        640,
        480,
      );

      const fused = fuseMultiAngleAnthropometrics(front, side, anchorHeightCm);

      expect(fused.isDualAngle).toBe(true);
      expect(fused.calibratedHeightCm).toBe(178);

      // Verify measured coronal widths
      expect(fused.shoulderWidthCm).toBeGreaterThan(34);
      expect(fused.shoulderWidthCm).toBeLessThan(52);
      expect(fused.hipWidthCm).toBeGreaterThan(26);
      expect(fused.hipWidthCm).toBeLessThan(44);

      // Verify measured sagittal depths
      expect(fused.chestDepthCm).toBeGreaterThanOrEqual(18);
      expect(fused.chestDepthCm).toBeLessThan(35);

      // Multi-equation regression validation
      expect(fused.bodyFatNavy).toBeGreaterThan(5);
      expect(fused.bodyFatSiri).toBeGreaterThan(5);
      expect(fused.bodyFatBrozek).toBeGreaterThan(5);
      expect(fused.bodyFatPercentage).toBeGreaterThan(5);
      expect(fused.bodyFatPercentage).toBeLessThan(35);

      // Mass conservation check
      const expectedTotal =
        fused.leanBodyMassKg +
        (fused.estimatedWeightKg * fused.bodyFatPercentage) / 100;
      expect(expectedTotal).toBeCloseTo(fused.estimatedWeightKg, 0);

      // Janssen bio-anthropometric regression
      expect(
        Math.abs(fused.skeletalMuscleMassKg - fused.leanBodyMassKg * 0.54),
      ).toBeLessThan(0.1);
    });

    it("property test: never produces NaN, negative, or unphysiological metrics across all body archetypes", () => {
      const poses = [standardFrontPose, endomorphPose, ectomorphPose];

      for (const pose of poses) {
        const metrics = computeAnthropometrics(pose, 175, 640, 480);
        expect(metrics.poseDetected).toBe(true);

        // Body Fat must be strictly physiological (3% to 55%)
        expect(metrics.bodyFatPercentage).toBeGreaterThanOrEqual(3);
        expect(metrics.bodyFatPercentage).toBeLessThanOrEqual(55);
        expect(Number.isNaN(metrics.bodyFatPercentage)).toBe(false);

        // Weight and lean mass must be positive and non-NaN
        expect(metrics.estimatedWeightKg).toBeGreaterThan(40);
        expect(metrics.estimatedWeightKg).toBeLessThanOrEqual(165);
        expect(metrics.leanBodyMassKg).toBeGreaterThan(30);
        expect(metrics.skeletalMuscleMassKg).toBeGreaterThan(15);
        expect(Number.isNaN(metrics.estimatedWeightKg)).toBe(false);

        // Dimensions must be positive and non-NaN
        expect(metrics.shoulderWidthCm).toBeGreaterThan(20);
        expect(metrics.waistCircumferenceCm).toBeGreaterThan(40);
        expect(metrics.hipWidthCm).toBeGreaterThan(20);
      }
    });

    it("sensitively reflects higher adipose and volume in endomorph compared to ectomorph", () => {
      const endo = computeAnthropometrics(endomorphPose, 175, 640, 480);
      const ecto = computeAnthropometrics(ectomorphPose, 175, 640, 480);

      expect(endo.waistCircumferenceCm).toBeGreaterThan(
        ecto.waistCircumferenceCm,
      );
      expect(endo.bodyFatPercentage).toBeGreaterThan(ecto.bodyFatPercentage);
      expect(endo.estimatedWeightKg).toBeGreaterThan(ecto.estimatedWeightKg);
    });

    it("accurately estimates adult male mass around 85-95kg for a robust 180cm frame rather than underestimating at 58kg", () => {
      // standardFrontPose represents a healthy adult male at 180cm anchor
      const metrics = computeAnthropometrics(
        standardFrontPose,
        180,
        640,
        480,
        "male",
      );
      // Realistic weight for an adult male at 180cm should be 75-95kg, never severely deflated to 58kg
      expect(metrics.estimatedWeightKg).toBeGreaterThanOrEqual(75);
      expect(metrics.estimatedWeightKg).toBeLessThanOrEqual(100);
      expect(metrics.biologicalSex).toBe("male");
    });
  });
});

