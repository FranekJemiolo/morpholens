import type { NormalizedLandmark } from "../../types/vision.ts";

/**
 * Low-pass exponential smoothing filter
 */
class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  public filter(val: number, alpha: number): number {
    if (this.s === null) {
      this.s = val;
    } else {
      this.s = alpha * val + (1.0 - alpha) * this.s;
    }
    this.y = val;
    return this.s;
  }

  public hasLastRawValue(): boolean {
    return this.y !== null;
  }

  public lastRawValue(): number {
    return this.y ?? 0;
  }

  public reset(): void {
    this.y = null;
    this.s = null;
  }
}

export interface OneEuroFilterConfig {
  minCutoff?: number; // Minimum cutoff frequency in Hz (lower = more smoothing at low speeds)
  beta?: number; // Speed coefficient (higher = less lag at high speeds)
  dCutoff?: number; // Cutoff frequency for derivative calculation in Hz
}

/**
 * 1€ Filter (OneEuroFilter)
 * Casiez, Roussel, Vogel (CHI 2012)
 * Eliminates jitter at low velocities while minimizing lag during rapid movement.
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(config: OneEuroFilterConfig = {}) {
    this.minCutoff = config.minCutoff ?? 1.0;
    this.beta = config.beta ?? 0.007;
    this.dCutoff = config.dCutoff ?? 1.0;
  }

  private alpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  public filter(val: number, timestampMs: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      return this.xFilter.filter(val, 1.0);
    }

    // Time delta in seconds
    const dt = Math.max(0.001, (timestampMs - this.lastTime) / 1000);
    this.lastTime = timestampMs;
    const rate = 1.0 / dt;

    // Filtered derivative (velocity)
    const dx = this.xFilter.hasLastRawValue()
      ? (val - this.xFilter.lastRawValue()) * rate
      : 0;
    const edx = this.dxFilter.filter(dx, this.alpha(rate, this.dCutoff));

    // Adaptive cutoff frequency based on velocity
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(val, this.alpha(rate, cutoff));
  }

  public reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

/**
 * Filter 3D Normalized Landmark (x, y, z, visibility)
 */
export class Landmark3DFilter {
  private fx: OneEuroFilter;
  private fy: OneEuroFilter;
  private fz: OneEuroFilter;
  private fVis: OneEuroFilter;

  constructor(config: OneEuroFilterConfig = {}) {
    this.fx = new OneEuroFilter(config);
    this.fy = new OneEuroFilter(config);
    this.fz = new OneEuroFilter(config);
    // Visibility filter can have slightly more aggressive smoothing
    this.fVis = new OneEuroFilter({ ...config, minCutoff: 0.5 });
  }

  public filter(
    lm: NormalizedLandmark,
    timestampMs: number,
  ): NormalizedLandmark {
    return {
      x: this.fx.filter(lm.x, timestampMs),
      y: this.fy.filter(lm.y, timestampMs),
      z: this.fz.filter(lm.z, timestampMs),
      visibility:
        lm.visibility !== undefined
          ? this.fVis.filter(lm.visibility, timestampMs)
          : undefined,
    };
  }

  public reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
    this.fVis.reset();
  }
}

/**
 * Full 33-point MediaPipe PoseLandmarks temporal smoothing pipeline
 */
export class PoseTemporalFilter {
  private filters: Landmark3DFilter[] = [];

  constructor(config: OneEuroFilterConfig = {}) {
    for (let i = 0; i < 33; i++) {
      this.filters.push(new Landmark3DFilter(config));
    }
  }

  public filter(
    landmarks: NormalizedLandmark[] | null,
    timestampMs: number,
  ): NormalizedLandmark[] | null {
    if (!landmarks || landmarks.length < 33) {
      this.reset();
      return landmarks;
    }

    return landmarks.map((lm, i) => {
      const f = this.filters[i];
      return f ? f.filter(lm, timestampMs) : lm;
    });
  }

  public reset(): void {
    this.filters.forEach((f) => f.reset());
  }
}
