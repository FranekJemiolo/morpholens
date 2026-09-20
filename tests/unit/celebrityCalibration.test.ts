import { describe, it, expect } from "vitest";
import {
  CELEBRITY_BENCHMARKS,
  generateCelebrityLandmarks,
} from "../../src/services/celebrityBenchmarks.ts";
import { computeAnthropometrics } from "../../src/lib/anthropometrics.ts";

describe("Celebrity Calibration & Extreme Physique Validation Suite", () => {
  it("contains exactly 20 diverse celebrity benchmark profiles across all archetypes", () => {
    expect(CELEBRITY_BENCHMARKS).toHaveLength(20);

    const categories = new Set(CELEBRITY_BENCHMARKS.map((b) => b.category));
    expect(categories.has("Strongman & Heavyweight")).toBe(true);
    expect(categories.has("Hyper-Muscular Bodybuilder")).toBe(true);
    expect(categories.has("Athletic Mesomorph")).toBe(true);
    expect(categories.has("Slender & Ectomorph")).toBe(true);
    expect(categories.has("Petite & Compact")).toBe(true);

    const males = CELEBRITY_BENCHMARKS.filter((b) => b.gender === "male");
    const females = CELEBRITY_BENCHMARKS.filter((b) => b.gender === "female");
    expect(males.length).toBeGreaterThanOrEqual(10);
    expect(females.length).toBeGreaterThanOrEqual(6);
  });

  it("evaluates all 20 celebrity benchmarks with high fidelity and low MAPE", () => {
    let totalAbsPercentageError = 0;
    const errors: { name: string; trueWeight: number; estimated: number; errorPct: number }[] =
      [];

    for (const benchmark of CELEBRITY_BENCHMARKS) {
      const landmarks = generateCelebrityLandmarks(benchmark, 640, 480);
      const metrics = computeAnthropometrics(
        landmarks,
        benchmark.heightCm,
        640,
        480,
        benchmark.gender,
      );

      expect(metrics.poseDetected).toBe(true);
      expect(metrics.estimatedWeightKg).toBeGreaterThan(0);

      const absErrorKg = Math.abs(metrics.estimatedWeightKg - benchmark.weightKg);
      const errorPct = (absErrorKg / benchmark.weightKg) * 100;
      totalAbsPercentageError += errorPct;

      errors.push({
        name: benchmark.name,
        trueWeight: benchmark.weightKg,
        estimated: metrics.estimatedWeightKg,
        errorPct: Number(errorPct.toFixed(2)),
      });

      // Individual tolerance: every individual celebrity estimation must be within 8.5%
      expect(
        errorPct,
        `${benchmark.name} estimated at ${metrics.estimatedWeightKg}kg vs ground truth ${benchmark.weightKg}kg (${errorPct.toFixed(1)}% error)`,
      ).toBeLessThanOrEqual(8.5);
    }

    const mape = totalAbsPercentageError / CELEBRITY_BENCHMARKS.length;
    // Mean Absolute Percentage Error (MAPE) across the full 20 profiles must be <= 5.5%
    expect(mape).toBeLessThanOrEqual(5.5);
  });

  describe("Extreme Physique Stress Tests", () => {
    it("accurately predicts extreme strongman mass for Eddie Hall (~160kg) without BMI clipping", () => {
      const eddie = CELEBRITY_BENCHMARKS.find((b) => b.id === "eddie-hall")!;
      const landmarks = generateCelebrityLandmarks(eddie);
      const metrics = computeAnthropometrics(landmarks, eddie.heightCm, 640, 480, eddie.gender);

      expect(metrics.estimatedWeightKg).toBeGreaterThanOrEqual(148);
      expect(metrics.estimatedWeightKg).toBeLessThanOrEqual(168);
      expect(metrics.bmi).toBeGreaterThan(40);
    });

    it("accurately predicts tall colossus mass for Shaquille O'Neal (216cm, 147kg)", () => {
      const shaq = CELEBRITY_BENCHMARKS.find((b) => b.id === "shaquille-oneal")!;
      const landmarks = generateCelebrityLandmarks(shaq);
      const metrics = computeAnthropometrics(landmarks, shaq.heightCm, 640, 480, shaq.gender);

      expect(metrics.estimatedWeightKg).toBeGreaterThanOrEqual(136);
      expect(metrics.estimatedWeightKg).toBeLessThanOrEqual(158);
    });

    it("accurately predicts peak bodybuilding V-taper for Arnold Schwarzenegger (188cm, 107kg)", () => {
      const arnold = CELEBRITY_BENCHMARKS.find((b) => b.id === "arnold-schwarzenegger")!;
      const landmarks = generateCelebrityLandmarks(arnold);
      const metrics = computeAnthropometrics(landmarks, arnold.heightCm, 640, 480, arnold.gender);

      expect(metrics.estimatedWeightKg).toBeGreaterThanOrEqual(100);
      expect(metrics.estimatedWeightKg).toBeLessThanOrEqual(114);
    });

    it("accurately predicts compact muscular gymnast mass for Simone Biles (142cm, 47kg)", () => {
      const simone = CELEBRITY_BENCHMARKS.find((b) => b.id === "simone-biles")!;
      const landmarks = generateCelebrityLandmarks(simone);
      const metrics = computeAnthropometrics(landmarks, simone.heightCm, 640, 480, simone.gender);

      expect(metrics.estimatedWeightKg).toBeGreaterThanOrEqual(43);
      expect(metrics.estimatedWeightKg).toBeLessThanOrEqual(50);
    });

    it("accurately predicts slender ectomorph mass for Timothée Chalamet (178cm, 65kg)", () => {
      const timothee = CELEBRITY_BENCHMARKS.find((b) => b.id === "timothee-chalamet")!;
      const landmarks = generateCelebrityLandmarks(timothee);
      const metrics = computeAnthropometrics(landmarks, timothee.heightCm, 640, 480, timothee.gender);

      expect(metrics.estimatedWeightKg).toBeGreaterThanOrEqual(61);
      expect(metrics.estimatedWeightKg).toBeLessThanOrEqual(69);
    });
  });
});
