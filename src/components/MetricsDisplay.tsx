import React, { useState } from "react";
import type { AnthropometricMetrics } from "../types/vision.ts";
import {
  Ruler,
  Weight,
  Flame,
  Dumbbell,
  HeartPulse,
  Share2,
  Check,
  Sparkles,
  Sliders,
} from "lucide-react";

interface MetricsDisplayProps {
  metrics: AnthropometricMetrics | null;
  anchorHeightCm: number;
  onUpdateAnchorHeight: (heightCm: number) => void;
  isImperial: boolean;
  onToggleUnits: () => void;
}

export const MetricsDisplay: React.FC<MetricsDisplayProps> = ({
  metrics,
  anchorHeightCm,
  onUpdateAnchorHeight,
  isImperial,
  onToggleUnits,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingHeight, setIsEditingHeight] = useState(false);
  const [tempHeight, setTempHeight] = useState(anchorHeightCm.toString());

  const handleSaveHeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempHeight);
    if (!isNaN(val) && val >= 100 && val <= 240) {
      onUpdateAnchorHeight(val);
      setIsEditingHeight(false);
    }
  };

  const cmToInches = (cm: number) => cm / 2.54;
  const kgToLbs = (kg: number) => kg * 2.20462;

  const formatLength = (cm: number) => {
    if (!cm) return "--";
    if (isImperial) {
      return `${cmToInches(cm).toFixed(1)} in`;
    }
    return `${cm.toFixed(1)} cm`;
  };

  const formatMass = (kg: number) => {
    if (!kg) return "--";
    if (isImperial) {
      return `${kgToLbs(kg).toFixed(1)} lbs`;
    }
    return `${kg.toFixed(1)} kg`;
  };

  // Determine body fat category
  const getFatCategory = (bf: number) => {
    if (!bf) return { label: "Awaiting Scan", color: "text-slate-400" };
    if (bf < 10)
      return { label: "Athletic / Essential", color: "text-cyan-400" };
    if (bf < 18) return { label: "Fitness Range", color: "text-emerald-400" };
    if (bf < 25) return { label: "Healthy Range", color: "text-sky-400" };
    return { label: "Above Average", color: "text-amber-400" };
  };

  const fatCategory = getFatCategory(metrics?.bodyFatPercentage ?? 0);

  const handleExportSummary = () => {
    if (!metrics) return;
    const report = `=== MORPHOLENS ANTHROPOMETRIC REPORT ===
Date: ${new Date().toLocaleString()}
Calibrated Height: ${anchorHeightCm} cm (${formatLength(anchorHeightCm)})
Estimated Weight: ${formatMass(metrics.estimatedWeightKg)}
Body Fat: ${metrics.bodyFatPercentage}% (${fatCategory.label})
Lean Body Mass: ${formatMass(metrics.leanBodyMassKg)}
Skeletal Muscle Mass: ${formatMass(metrics.skeletalMuscleMassKg)}
----------------------------------------
Biacromial Span (Shoulders): ${formatLength(metrics.shoulderWidthCm)}
Waist Circumference: ${formatLength(metrics.waistCircumferenceCm)}
Bi-iliac Span (Hips): ${formatLength(metrics.hipWidthCm)}
Torso Length: ${formatLength(metrics.torsoLengthCm)}
Tracking Confidence: ${(metrics.confidence * 100).toFixed(0)}%
========================================
100% Client-side AI | github.com/FranekJemiolo/morpholens`;

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Anchor Height & Unit Controls Header */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Anchor Scale Metric
            </div>
            {isEditingHeight ? (
              <form
                onSubmit={handleSaveHeight}
                className="flex items-center space-x-2 mt-1"
              >
                <input
                  type="number"
                  min="100"
                  max="240"
                  value={tempHeight}
                  onChange={(e) => setTempHeight(e.target.value)}
                  className="w-20 px-2 py-0.5 bg-slate-900 border border-cyan-500/50 rounded text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  autoFocus
                />
                <span className="text-xs font-mono text-slate-400">cm</span>
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-lg font-mono font-bold text-white">
                  {anchorHeightCm} cm
                </span>
                <button
                  onClick={() => setIsEditingHeight(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono underline ml-2"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Unit Toggle & Export */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleUnits}
            className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-xs font-mono transition flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isImperial ? "IMPERIAL (lbs/in)" : "METRIC (kg/cm)"}</span>
          </button>

          <button
            onClick={handleExportSummary}
            disabled={!metrics?.poseDetected}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-1.5 ${
              metrics?.poseDetected
                ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>COPIED!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>EXPORT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Weight */}
        <div
          data-testid="card-weight"
          className="glass-panel p-4 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              EST. WEIGHT
            </span>
            <Weight className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-extrabold text-white">
            {metrics?.poseDetected
              ? formatMass(metrics.estimatedWeightKg)
              : "--"}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Volumetric summation (ρ=1.055)
          </div>
        </div>

        {/* Body Fat % */}
        <div
          data-testid="card-bodyfat"
          className="glass-panel p-4 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">BODY FAT %</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-extrabold text-emerald-400">
            {metrics?.poseDetected
              ? `${metrics.bodyFatPercentage.toFixed(1)}%`
              : "--"}
          </div>
          <div className={`text-[10px] font-mono mt-1 ${fatCategory.color}`}>
            {fatCategory.label}
          </div>
        </div>

        {/* Skeletal Muscle Mass */}
        <div
          data-testid="card-muscle"
          className="glass-panel p-4 rounded-xl border border-sky-500/20 hover:border-sky-500/40 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              MUSCLE MASS
            </span>
            <Dumbbell className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-extrabold text-white">
            {metrics?.poseDetected
              ? formatMass(metrics.skeletalMuscleMassKg)
              : "--"}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Janssen bio-regression
          </div>
        </div>

        {/* Lean Body Mass */}
        <div
          data-testid="card-lean"
          className="glass-panel p-4 rounded-xl border border-violet-500/20 hover:border-violet-500/40 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">LEAN MASS</span>
            <HeartPulse className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-extrabold text-white">
            {metrics?.poseDetected ? formatMass(metrics.leanBodyMassKg) : "--"}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Total non-adipose mass
          </div>
        </div>
      </div>

      {/* Biomechanical Dimensions Breakdown */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-3 font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Biomechanical Proportions</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">
              SHOULDER SPAN
            </span>
            <span className="text-sm font-mono font-bold text-slate-200 mt-1 block">
              {metrics?.poseDetected
                ? formatLength(metrics.shoulderWidthCm)
                : "--"}
            </span>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">
              WAIST CIRCUMFERENCE
            </span>
            <span className="text-sm font-mono font-bold text-slate-200 mt-1 block">
              {metrics?.poseDetected
                ? formatLength(metrics.waistCircumferenceCm)
                : "--"}
            </span>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">
              HIP SPAN
            </span>
            <span className="text-sm font-mono font-bold text-slate-200 mt-1 block">
              {metrics?.poseDetected ? formatLength(metrics.hipWidthCm) : "--"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center mt-3">
          <div className="p-2 bg-slate-900/40 rounded-lg border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 block">
              ARM LENGTH
            </span>
            <span className="text-xs font-mono font-bold text-slate-300 mt-0.5 block">
              {metrics?.poseDetected ? formatLength(metrics.armLengthCm) : "--"}
            </span>
          </div>

          <div className="p-2 bg-slate-900/40 rounded-lg border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 block">
              LEG LENGTH
            </span>
            <span className="text-xs font-mono font-bold text-slate-300 mt-0.5 block">
              {metrics?.poseDetected ? formatLength(metrics.legLengthCm) : "--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
