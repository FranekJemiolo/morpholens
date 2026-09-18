import React, { useRef, useEffect } from "react";
import {
  Camera,
  RefreshCw,
  AlertTriangle,
  PlayCircle,
  Eye,
  Activity,
  Scan,
  Compass,
  CheckCircle2,
} from "lucide-react";
import type {
  NormalizedLandmark,
  AnthropometricMetrics,
  CaptureStage,
  PoseQualityAssessment,
} from "../types/vision.ts";
import { POSE_CONNECTIONS } from "../services/poseLandmarker.ts";
import { projectToCanvas } from "../lib/anthropometrics.ts";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarks: NormalizedLandmark[] | null;
  confidence: number;
  fps: number;
  error: string | null;
  isLoading: boolean;
  isMock: boolean;
  facingMode: "user" | "environment";
  videoWidth: number;
  videoHeight: number;
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
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  landmarks,
  confidence: _confidence,
  fps,
  error,
  isLoading,
  isMock,
  facingMode,
  videoWidth,
  videoHeight,
  onToggleCamera,
  onToggleMock,
  onRetry,
  metrics,
  captureStage,
  countdown,
  quality,
  onStartGuidedScan,
  onResetScan,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        const projectedPoints = landmarks.map((lm) =>
          projectToCanvas(lm, width, height, videoWidth, videoHeight, true),
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
  }, [landmarks, isMock, metrics, videoWidth, videoHeight, quality]);

  const isGuidedMode = captureStage !== "idle" && captureStage !== "completed";

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col">
      {/* Live Video Mirror */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover -scale-x-100 ${
          isMock ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Canvas HUD Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Scanline Effect */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-40 z-10" />

      {/* Top HUD Status Bar */}
      <div className="relative z-20 flex items-center justify-between p-3 bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-transparent">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900/80 rounded-md border border-cyan-500/20 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                landmarks
                  ? "bg-emerald-400 animate-ping"
                  : isLoading
                    ? "bg-amber-400 animate-pulse"
                    : "bg-cyan-400"
              }`}
            />
            <span className="text-slate-300 font-medium">
              {landmarks
                ? "TRACKING ACTIVE"
                : isMock
                  ? "SIMULATION"
                  : "STANDBY"}
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-slate-900/80 rounded-md border border-slate-800 text-[11px] font-mono text-slate-400">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>{fps} FPS</span>
          </div>

          {quality && (
            <div
              className={`hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-md border text-[11px] font-mono ${
                quality.qualityScore >= 80
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : quality.qualityScore >= 50
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              <Scan className="w-3 h-3" />
              <span>{quality.qualityScore}% QUALITY</span>
            </div>
          )}
        </div>

        {/* Camera and Scan Flow Controls */}
        <div className="flex items-center space-x-2">
          {captureStage === "idle" ? (
            <button
              onClick={onStartGuidedScan}
              className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-md text-xs font-mono transition flex items-center space-x-1.5 shadow-neon"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>GUIDED SCAN</span>
            </button>
          ) : captureStage === "completed" ? (
            <button
              onClick={onResetScan}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-mono transition flex items-center space-x-1.5 border border-slate-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>RE-SCAN</span>
            </button>
          ) : (
            <button
              onClick={onResetScan}
              className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-md text-xs font-mono transition border border-red-500/30"
            >
              CANCEL
            </button>
          )}

          <button
            data-testid="btn-simulate"
            onClick={onToggleMock}
            title={isMock ? "Switch to Live Camera" : "Simulate / Test Feed"}
            className={`px-2.5 py-1 rounded-md text-xs font-mono border transition flex items-center space-x-1 ${
              isMock
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-900/80 text-slate-300 border-slate-700 hover:border-cyan-500/50"
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>{isMock ? "LIVE WEBCAM" : "SIMULATE"}</span>
          </button>

          {!isMock && (
            <button
              onClick={onToggleCamera}
              title={`Switch camera (current: ${facingMode})`}
              className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded-md border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Actionable Pose Quality Feedback Banner */}
      {quality && quality.feedbackMessage && (
        <div className="absolute top-14 inset-x-4 z-20 flex justify-center pointer-events-none">
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

      {/* Countdown Overlay during auto-capture */}
      {countdown !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/30 pointer-events-none">
          <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center backdrop-blur-md animate-ping">
            <span className="text-5xl font-extrabold font-mono text-cyan-300">
              {countdown}
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

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm">
          <div className="p-3 bg-cyan-500/10 rounded-full border border-cyan-500/30 mb-3 animate-spin">
            <RefreshCw className="w-6 h-6 text-cyan-400" />
          </div>
          <p className="text-sm font-mono text-cyan-300">
            Initializing MediaPipe Neural Model...
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Loading WebAssembly Runtime
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && !isMock && (
        <div className="absolute inset-x-4 bottom-4 z-30 p-4 bg-red-950/90 border border-red-500/50 rounded-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="text-xs leading-relaxed">{error}</div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded-lg text-xs font-mono transition"
            >
              Retry
            </button>
            <button
              data-testid="btn-simulate-error"
              onClick={onToggleMock}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono transition flex items-center space-x-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Simulate Pose</span>
            </button>
          </div>
        </div>
      )}

      {/* Standby Hint */}
      {!isLoading && !error && !landmarks && !isMock && !isGuidedMode && (
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center pointer-events-none">
          <div className="px-4 py-2 bg-slate-900/85 backdrop-blur-md rounded-full border border-cyan-500/20 text-xs font-mono text-slate-300 flex items-center space-x-2 shadow-neon">
            <Camera className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Step into camera frame to initialize 33-point tracking</span>
          </div>
        </div>
      )}
    </div>
  );
};
