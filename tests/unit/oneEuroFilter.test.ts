import { describe, it, expect } from "vitest";
import {
  OneEuroFilter,
  Landmark3DFilter,
  PoseTemporalFilter,
} from "../../src/lib/filters/oneEuroFilter.ts";
import { standardFrontPose } from "../fixtures/landmarks.ts";

describe("1€ Filter (OneEuroFilter) Temporal Smoothing", () => {
  it("effectively attenuates high-frequency noise on stationary signals", () => {
    const filter = new OneEuroFilter({ minCutoff: 1.0, beta: 0.005 });
    const baseValue = 0.5;
    const noisyOutputs: number[] = [];

    // Simulate 30 frames of a stationary signal with Gaussian-like jitter (+/- 0.02)
    let t = 0;
    for (let i = 0; i < 30; i++) {
      t += 33.3; // ~30 FPS (33.3ms)
      const noise = Math.sin(i * 1.7) * 0.02;
      const raw = baseValue + noise;
      const filtered = filter.filter(raw, t);
      noisyOutputs.push(filtered);
    }

    // Verify filtered values have significantly lower variance than raw noise
    const last10 = noisyOutputs.slice(-10);
    const maxDelta = Math.max(...last10) - Math.min(...last10);

    // Filtered variance should be suppressed below raw noise amplitude
    expect(maxDelta).toBeLessThan(0.025);
    expect(last10[last10.length - 1]).toBeCloseTo(baseValue, 1);
  });

  it("quickly tracks abrupt step changes without excessive lag", () => {
    const filter = new OneEuroFilter({ minCutoff: 1.0, beta: 0.02 });
    let t = 0;

    // Settle at 0.2
    for (let i = 0; i < 15; i++) {
      t += 33.3;
      filter.filter(0.2, t);
    }

    // Step change from 0.2 to 0.8
    t += 33.3;
    const immediateResponse = filter.filter(0.8, t);
    expect(immediateResponse).toBeGreaterThan(0.28);

    // After 10 frames (~330ms), should approach 0.8
    let settled = immediateResponse;
    for (let i = 0; i < 10; i++) {
      t += 33.3;
      settled = filter.filter(0.8, t);
    }
    expect(settled).toBeGreaterThan(0.7);
  });

  it("resets internal state cleanly upon request", () => {
    const filter = new OneEuroFilter();
    filter.filter(10.0, 0);
    filter.filter(10.0, 33);
    filter.reset();

    // After reset, first value should be treated as initial value without lag
    const fresh = filter.filter(0.0, 100);
    expect(fresh).toBe(0.0);
  });

  it("smooths 3D landmarks via Landmark3DFilter", () => {
    const filter3D = new Landmark3DFilter();
    const lm1 = { x: 0.5, y: 0.5, z: 0.0, visibility: 0.95 };
    const filtered1 = filter3D.filter(lm1, 0);

    expect(filtered1.x).toBe(0.5);
    expect(filtered1.y).toBe(0.5);
    expect(filtered1.z).toBe(0.0);
    expect(filtered1.visibility).toBe(0.95);

    const lm2 = { x: 0.52, y: 0.49, z: 0.01, visibility: 0.9 };
    const filtered2 = filter3D.filter(lm2, 33);
    expect(filtered2.x).toBeGreaterThan(0.5);
    expect(filtered2.x).toBeLessThan(0.52);
  });

  it("processes full 33-point pose landmark arrays via PoseTemporalFilter", () => {
    const poseFilter = new PoseTemporalFilter();
    const result = poseFilter.filter(standardFrontPose, 0);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(33);
    expect(result![11].x).toBeCloseTo(standardFrontPose[11].x, 2);

    // Feeding empty landmarks returns null and resets
    expect(poseFilter.filter(null, 100)).toBeNull();
  });
});
