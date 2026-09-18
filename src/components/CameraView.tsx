import React, { useRef, useEffect, useState } from "react";
import {
  RefreshCw,
  AlertTriangle,
  Activity,
  Scan,
  Compass,
  CheckCircle2,
  Users,
  ChevronDown,
  Upload,
  Camera,
} from "lucide-react";
import type {
  NormalizedLandmark,
  AnthropometricMetrics,
  CaptureStage,
  PoseQualityAssessment,
} from "../types/vision.ts";
import { POSE_CONNECTIONS } from "../services/poseLandmarker.ts";
import { projectToCanvas } from "../lib/anthropometrics.ts";
import { SAMPLE_HUMANS } from "../services/samplePresets.ts";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  sampleImageRef: React.RefObject<HTMLImageElement | null>;
  samplePresetId: string | null;
  sampleImageUrl: string | null;
  onSelectSample: (presetId: string | null, customUrl?: string) => void;
  onImageLoad?: (width: number, height: number) => void;
  customOrientation?: "front" | "side";
  onToggleCustomOrientation?: () => void;
  landmarks: NormalizedLandmark[] | null;
  confidence: number;
  fps: number;
  error: string | null;
  isLoading: boolean;
  isMock: boolean;
  facingMode: "user" | "environment";
  videoWidth: number;
  videoHeight: number;
  isLiveCameraActive?: boolean;
  onStartLiveCamera?: () => void;
  onStopLiveCamera?: () => void;
  onToggleCamera: () => void;
  onToggleMock: () => void;
  onRetry: () => void;
  anchorHeightCm: number;
  metrics: AnthropometricMetrics | null;
  captureStage: CaptureStage;
  countdown: number | null;
  quality: PoseQualityAssessment | null;
  onStartGuidedScan: () => void;
  onResetScan: () => void;
  biologicalSex?: "male" | "female";
  onToggleSex?: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  sampleImageRef,
  samplePresetId,
  sampleImageUrl,
  onSelectSample,
  onImageLoad,
  customOrientation,
  onToggleCustomOrientation,
  landmarks,
  confidence: _confidence,
  fps,
  error,
  isLoading,
  isMock,
  facingMode,
  videoWidth,
  videoHeight,
  isLiveCameraActive,
  onStartLiveCamera,
  onStopLiveCamera,
  onToggleCamera,
  onToggleMock: _onToggleMock,
  onRetry,
  metrics,
  captureStage,
  countdown,
  quality,
  onStartGuidedScan,
  onResetScan,
  biologicalSex = "male",
  onToggleSex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Render skeleton HUD and dynamic viewport silhouette guide over video
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Cybernetic Grid in Mock / Sim Mode
      if (isMock) {
        ctx.fillStyle = "#0B1120";
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // 2. Viewport Silhouette Alignment Guide
      const alignmentColor =
        quality?.alignmentState === "locked"
          ? "#10B981" // Emerald Green
          : quality?.alignmentState === "aligning"
            ? "#38BDF8" // Electric Cyan
            : "#F59E0B"; // Amber / Out of frame

      ctx.save();
      ctx.strokeStyle = alignmentColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.globalAlpha = 0.35;

      // Draw stylized body silhouette stencil
      const cx = width / 2;
      const headR = height * 0.07;
      const headY = height * 0.16;

      // Head circle
      ctx.beginPath();
      ctx.arc(cx, headY, headR, 0, Math.PI * 2);
      ctx.stroke();

      // Torso & Shoulders
      const sWidth = width * 0.28;
      const hipWidth = width * 0.22;
      const sY = headY + headR + height * 0.04;
      const hipY = sY + height * 0.24;

      ctx.beginPath();
      ctx.moveTo(cx - sWidth / 2, sY);
      ctx.lineTo(cx + sWidth / 2, sY);
      ctx.lineTo(cx + hipWidth / 2, hipY);
      ctx.lineTo(cx - hipWidth / 2, hipY);
      ctx.closePath();
      ctx.stroke();

      // Legs guide
      const footY = height * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx - hipWidth * 0.35, hipY);
      ctx.lineTo(cx - hipWidth * 0.35, footY);
      ctx.moveTo(cx + hipWidth * 0.35, hipY);
      ctx.lineTo(cx + hipWidth * 0.35, footY);
      ctx.stroke();

      ctx.restore();

      // 3. HUD Corner Viewfinder Brackets
      const bSize = 24;
      ctx.strokeStyle = alignmentColor;
      ctx.lineWidth = 2.5;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(16, 16 + bSize);
      ctx.lineTo(16, 16);
      ctx.lineTo(16 + bSize, 16);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(width - 16 - bSize, 16);
      ctx.lineTo(width - 16, 16);
      ctx.lineTo(width - 16, 16 + bSize);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(16, height - 16 - bSize);
      ctx.lineTo(16, height - 16);
      ctx.lineTo(16 + bSize, height - 16);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(width - 16 - bSize, height - 16);
      ctx.lineTo(width - 16, height - 16);
      ctx.lineTo(width - 16, height - 16 - bSize);
      ctx.stroke();

      // 4. Draw Skeleton with Aspect-Ratio Projection Correction
      if (landmarks && landmarks.length >= 33) {
        // Project normalized landmarks to canvas coordinates taking object-fit:cover into account
        const isMirrored = !sampleImageUrl && facingMode === "user";
        const projectedPoints = landmarks.map((lm) =>
          projectToCanvas(
            lm,
            width,
            height,
            videoWidth,
            videoHeight,
            isMirrored,
          ),
        );

        // Draw Skeletal Bone Connections
        ctx.save();
        for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
          const p1 = projectedPoints[startIndex];
          const p2 = projectedPoints[endIndex];
          if (!p1 || !p2 || p1.visibility < 0.35 || p2.visibility < 0.35)
            continue;

          const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          grad.addColorStop(0, "rgba(56, 189, 248, 0.9)");
          grad.addColorStop(1, "rgba(16, 185, 129, 0.9)");

          ctx.strokeStyle = grad;
          ctx.lineWidth = 3.5;
          ctx.lineCap = "round";
          ctx.shadowColor = "#38BDF8";
          ctx.shadowBlur = 8;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.restore();

        // Measurement Brackets Overlay
        if (metrics && metrics.poseDetected) {
          const sLeft = projectedPoints[11];
          const sRight = projectedPoints[12];
          if (sLeft && sRight) {
            ctx.save();
            ctx.strokeStyle = "#F59E0B";
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(sLeft.x, sLeft.y - 12);
            ctx.lineTo(sRight.x, sRight.y - 12);
            ctx.stroke();
            ctx.setLineDash([]);

            const midX = (sLeft.x + sRight.x) / 2;
            ctx.fillStyle = "#F59E0B";
            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText(
              `SHOULDERS: ${metrics.shoulderWidthCm.toFixed(1)} cm`,
              midX,
              Math.min(sLeft.y, sRight.y) - 20,
            );
            ctx.restore();
          }

          const hLeft = projectedPoints[23];
          const hRight = projectedPoints[24];
          if (hLeft && hRight) {
            ctx.save();
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(hLeft.x, hLeft.y + 12);
            ctx.lineTo(hRight.x, hRight.y + 12);
            ctx.stroke();
            ctx.setLineDash([]);

            const midX = (hLeft.x + hRight.x) / 2;
            ctx.fillStyle = "#38BDF8";
            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText(
              `HIPS: ${metrics.hipWidthCm.toFixed(1)} cm`,
              midX,
              Math.max(hLeft.y, hRight.y) + 26,
            );
            ctx.restore();
          }
        }

        // Joint Nodes
        projectedPoints.forEach((pt, idx) => {
          if (pt.visibility < 0.35) return;
          const isMajorJoint = [11, 12, 23, 24, 25, 26, 27, 28].includes(idx);
          const radius = isMajorJoint ? 6 : 4;

          ctx.save();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius + 3, 0, 2 * Math.PI);
          ctx.fillStyle = isMajorJoint
            ? "rgba(16, 185, 129, 0.3)"
            : "rgba(56, 189, 248, 0.25)";
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = isMajorJoint ? "#10B981" : "#38BDF8";
          ctx.shadowColor = isMajorJoint ? "#10B981" : "#38BDF8";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        });
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    landmarks,
    isMock,
    metrics,
    videoWidth,
    videoHeight,
    quality,
    sampleImageUrl,
    facingMode,
  ]);

  const isGuidedMode = captureStage !== "idle" && captureStage !== "completed";
  const activePreset = SAMPLE_HUMANS.find((s) => s.id === samplePresetId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      onSelectSample("custom", url);
      setShowSampleMenu(false);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      onSelectSample("custom", url);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col"
    >
      {/* Live Video Mirror or Sample/Uploaded Human Subject */}
      {sampleImageUrl ? (
        <img
          ref={sampleImageRef}
          src={sampleImageUrl}
          alt="Human Test Subject"
          crossOrigin="anonymous"
          onLoad={(e) =>
            onImageLoad?.(
              e.currentTarget.naturalWidth,
              e.currentTarget.naturalHeight,
            )
          }
          className="absolute inset-0 w-full h-full object-cover select-none"
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            facingMode === "user" ? "-scale-x-100" : ""
          } ${isMock ? "opacity-0" : "opacity-100"}`}
        />
      )}

      {/* Drag & Drop Visual Backdrop Highlight */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-cyan-950/90 backdrop-blur-md border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center p-6 text-center animate-pulse">
          <div className="p-4 bg-cyan-500/20 rounded-full border border-cyan-400 mb-3 text-cyan-300">
            <Upload className="w-8 h-8 animate-bounce" />
          </div>
          <p className="text-base font-mono font-bold text-cyan-200">
            Drop Full-Body Photo Here to Analyze
          </p>
          <p className="text-xs font-mono text-cyan-400/80 mt-1">
            JPEG, PNG, or WebP • 100% Client-Side Private
          </p>
        </div>
      )}

      {/* Canvas HUD Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Scanline Effect */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-40 z-10" />

      {/* Top HUD Status Bar */}
      <div className="relative z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-slate-950/95 via-slate-950/70 to-transparent gap-2">
        {/* Left: Status & Quality Telemetry */}
        <div className="flex items-center min-w-0 gap-1.5">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-slate-900/90 rounded border border-cyan-500/20 text-[11px] font-mono whitespace-nowrap">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                landmarks
                  ? "bg-emerald-400 animate-ping"
                  : isLoading
                    ? "bg-amber-400 animate-pulse"
                    : "bg-cyan-400"
              }`}
            />
            <span className="text-slate-300 font-medium">
              {landmarks
                ? samplePresetId === "custom"
                  ? "PHOTO ANALYZED"
                  : sampleImageUrl
                    ? "HUMAN DETECTED"
                    : "TRACKING ACTIVE"
                : sampleImageUrl
                  ? "ANALYZING PHOTO..."
                  : isMock
                    ? "SIMULATION"
                    : isLiveCameraActive
                      ? "CAMERA ACTIVE"
                      : "AWAITING PHOTO"}
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-1 px-1.5 py-0.5 bg-slate-900/80 rounded border border-slate-800 text-[10px] font-mono text-slate-400 whitespace-nowrap">
            <Activity className="w-2.5 h-2.5 text-cyan-400" />
            <span>{fps} FPS</span>
          </div>

          {quality && (
            <div
              className={`hidden md:flex items-center space-x-1 px-1.5 py-0.5 rounded border text-[10px] font-mono whitespace-nowrap ${
                quality.qualityScore >= 80
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : quality.qualityScore >= 50
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              <Scan className="w-2.5 h-2.5" />
              <span>{quality.qualityScore}%</span>
            </div>
          )}
        </div>

        {/* Right: Camera, Upload, Sample Menu, and Sim Controls */}
        <div className="flex items-center flex-shrink-0 gap-1">
          {/* Guided Scan only for active camera capture */}
          {isLiveCameraActive && !sampleImageUrl && (
            <>
              {captureStage === "idle" ? (
                <button
                  onClick={onStartGuidedScan}
                  className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded text-[10px] font-mono transition flex items-center space-x-1 shadow-neon"
                >
                  <Compass className="w-3 h-3" />
                  <span>GUIDED SCAN</span>
                </button>
              ) : captureStage === "completed" ? (
                <button
                  onClick={onResetScan}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-mono transition flex items-center space-x-1 border border-slate-700"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>RE-SCAN</span>
                </button>
              ) : (
                <button
                  onClick={onResetScan}
                  className="px-1.5 py-0.5 bg-red-950/80 hover:bg-red-900 text-red-300 rounded text-[10px] font-mono transition border border-red-500/30"
                >
                  CANCEL
                </button>
              )}
            </>
          )}

          {/* Switch between Photo Mode and Live Camera Mode */}
          {onStartLiveCamera && (
            <button
              data-testid="btn-toggle-camera-mode"
              onClick={
                isLiveCameraActive ? onStopLiveCamera : onStartLiveCamera
              }
              title={
                isLiveCameraActive
                  ? "Switch to Photo Upload Mode"
                  : "Switch to Live Webcam Capture"
              }
              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition flex items-center space-x-1 ${
                isLiveCameraActive
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-neon"
                  : "bg-slate-900/80 text-slate-300 border-slate-700 hover:border-cyan-500/50"
              }`}
            >
              {isLiveCameraActive ? (
                <>
                  <Upload className="w-3 h-3 text-cyan-400" />
                  <span>PHOTO MODE</span>
                </>
              ) : (
                <>
                  <Camera className="w-3 h-3 text-cyan-400" />
                  <span>USE CAMERA</span>
                </>
              )}
            </button>
          )}

            {/* Hidden File Input for Custom Uploads */}
            <input
              ref={fileInputRef}
              data-testid="input-file-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Orientation Toggle for Custom Uploaded Photo */}
            {samplePresetId === "custom" && onToggleCustomOrientation && (
              <button
                data-testid="btn-toggle-custom-angle"
                onClick={onToggleCustomOrientation}
                title="Toggle Front standing view vs Side profile view"
                className="px-1.5 py-0.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 rounded text-[10px] font-mono transition flex items-center space-x-1"
              >
                <span className="text-[9px] text-slate-400">ANGLE:</span>
                <span className="font-bold uppercase">
                  {customOrientation || "front"}
                </span>
              </button>
            )}

            {/* Biological Sex Toggle Button */}
            {onToggleSex && (
              <button
                data-testid="btn-toggle-sex"
                onClick={onToggleSex}
                title={`Biological Sex: ${biologicalSex.toUpperCase()} (Click to toggle)`}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition flex items-center space-x-1 ${
                  biologicalSex === "female"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-neon"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-neon"
                }`}
              >
                <span>{biologicalSex === "female" ? "♀ FEMALE" : "♂ MALE"}</span>
              </button>
            )}

            {/* Sample Human Test Subjects Selector Dropdown Menu */}
            <div className="relative">
              <button
                data-testid="btn-sample-toggle"
                onClick={() => setShowSampleMenu((prev) => !prev)}
                title={
                  activePreset
                    ? `Active Preset: ${activePreset.name} (${activePreset.suggestedHeightCm}cm)`
                    : "Test with Generated Human Photos"
                }
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition flex items-center space-x-1 ${
                  samplePresetId && samplePresetId !== "custom"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-neon"
                    : "bg-slate-900/80 text-slate-300 border-slate-700 hover:border-cyan-500/50"
                }`}
              >
                <Users className="w-3 h-3 text-cyan-400" />
                <span>SAMPLES</span>
                <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
              </button>

              {showSampleMenu && (
                <div className="absolute right-0 mt-1 w-52 bg-slate-950/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl z-30 py-1 text-xs font-mono">
                  <div className="px-3 py-1 text-[10px] text-cyan-400/80 font-semibold uppercase tracking-wider border-b border-slate-800">
                    AI Human Test Subjects
                  </div>
                  {SAMPLE_HUMANS.map((sample) => (
                    <button
                      key={sample.id}
                      data-testid={`btn-sample-${sample.id}`}
                      onClick={() => {
                        onSelectSample(sample.id);
                        setShowSampleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-cyan-500/15 transition flex items-center justify-between ${
                        samplePresetId === sample.id
                          ? "text-cyan-300 font-bold bg-cyan-500/10"
                          : "text-slate-300"
                      }`}
                    >
                      <span>{sample.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {sample.suggestedHeightCm}cm
                      </span>
                    </button>
                  ))}

                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowSampleMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 transition flex items-center justify-between cursor-pointer border-t border-slate-800 mt-1 pt-1.5"
                  >
                    <span className="flex items-center space-x-1.5">
                      <Upload className="w-3 h-3 text-cyan-400" />
                      <span>Upload Custom Photo</span>
                    </span>
                  </button>

                  {samplePresetId && (
                    <button
                      data-testid="btn-sample-clear"
                      onClick={() => {
                        onSelectSample(null);
                        setShowSampleMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-red-500/15 text-red-400 hover:text-red-300 transition border-t border-slate-800 mt-1 pt-1.5"
                    >
                      Clear Photo (Standby)
                    </button>
                  )}
                </div>
              )}
            </div>

          {!isMock && !sampleImageUrl && isLiveCameraActive && (
            <button
              onClick={onToggleCamera}
              title={`Switch camera (current: ${facingMode})`}
              className="p-1 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded border border-slate-700 transition"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Actionable Pose Quality Feedback Banner - positioned cleanly at bottom */}
      {quality && quality.feedbackMessage && (
        <div className="absolute bottom-4 inset-x-4 z-20 flex justify-center pointer-events-none">
          <div
            className={`px-4 py-1.5 rounded-full border backdrop-blur-md text-xs font-mono flex items-center space-x-2 shadow-lg transition-all ${
              quality.alignmentState === "locked"
                ? "bg-emerald-950/85 border-emerald-500/50 text-emerald-300"
                : quality.alignmentState === "aligning"
                  ? "bg-slate-900/85 border-cyan-500/30 text-cyan-300"
                  : "bg-amber-950/85 border-amber-500/50 text-amber-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                quality.alignmentState === "locked"
                  ? "bg-emerald-400 animate-ping"
                  : quality.alignmentState === "aligning"
                    ? "bg-cyan-400"
                    : "bg-amber-400 animate-pulse"
              }`}
            />
            <span>{quality.feedbackMessage}</span>
          </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-7xl md:text-8xl font-black font-mono text-cyan-400 drop-shadow-[0_0_25px_rgba(56,189,248,0.8)]">
              {countdown}
            </span>
            <span className="text-sm font-mono text-cyan-200 mt-2 tracking-widest uppercase">
              Capturing pose...
            </span>
          </div>
        </div>
      )}

      {/* Multi-Angle Guided Stage Indicator */}
      {isGuidedMode && (
        <div className="absolute bottom-4 inset-x-4 z-20 flex justify-center pointer-events-none">
          <div className="px-4 py-2 bg-slate-950/90 backdrop-blur-md rounded-xl border border-cyan-500/30 text-xs font-mono flex items-center space-x-4 shadow-neon">
            <div
              className={`flex items-center space-x-1.5 ${
                captureStage.startsWith("front")
                  ? "text-cyan-400 font-bold"
                  : "text-emerald-400 line-through opacity-70"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] border border-cyan-500/40">
                1
              </span>
              <span>FRONT VIEW</span>
            </div>
            <span className="text-slate-600">&rarr;</span>
            <div
              className={`flex items-center space-x-1.5 ${
                captureStage.startsWith("side")
                  ? "text-emerald-400 font-bold animate-pulse"
                  : "text-slate-500"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] border border-slate-700">
                2
              </span>
              <span>SIDE PROFILE</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Live Camera */}
      {isLoading && !isMock && !sampleImageUrl && isLiveCameraActive && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm pointer-events-none">
          <div className="p-3 bg-cyan-500/10 rounded-full border border-cyan-500/30 mb-3 animate-spin">
            <RefreshCw className="w-6 h-6 text-cyan-400" />
          </div>
          <p className="text-sm font-mono text-cyan-300">
            Connecting Biometric Optical Sensor...
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Accessing Webcam Device
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && !isMock && !sampleImageUrl && (
        <div className="absolute inset-x-4 bottom-4 z-30 p-4 bg-red-950/90 border border-red-500/50 rounded-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="text-xs font-mono">
              <p className="font-semibold text-white">Camera Offline</p>
              <p className="text-red-300/80">{error}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition flex items-center space-x-1 border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono transition flex items-center space-x-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>
            <button
              data-testid="btn-sample-fallback"
              onClick={() => onSelectSample("male-front")}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono transition flex items-center space-x-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Sample Subject</span>
            </button>
          </div>
        </div>
      )}

      {/* Standby Hero Center Card */}
      {!isLoading &&
        !error &&
        !landmarks &&
        !isMock &&
        !isGuidedMode &&
        !sampleImageUrl &&
        !isLiveCameraActive && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 pt-16 pointer-events-none">
            <div className="max-w-md w-full p-6 bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-cyan-500/30 text-center shadow-2xl flex flex-col items-center space-y-4 pointer-events-auto">
              <div className="p-3.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 text-cyan-400 shadow-neon">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 font-mono tracking-wide">
                  ANALYZE FULL-BODY PHOTO
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Upload your own photo or choose a sample subject. You can also
                  switch to live camera anytime. 100% client-side WebAssembly
                  inference — zero cloud compute.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-1">
                <button
                  data-testid="btn-standby-upload"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs font-mono transition flex items-center justify-center space-x-2 shadow-neon cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Photo</span>
                </button>
                <button
                  data-testid="btn-standby-sample"
                  onClick={() => onSelectSample("male-front")}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 border border-slate-700 rounded-xl text-xs font-mono transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Sample Subject</span>
                </button>
              </div>
              {onStartLiveCamera && (
                <button
                  data-testid="btn-standby-camera"
                  onClick={onStartLiveCamera}
                  className="w-full py-2 px-4 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-mono transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Switch to Live Camera</span>
                </button>
              )}
            </div>
          </div>
        )}
    </div>
  );
};
