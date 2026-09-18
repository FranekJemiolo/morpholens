import React, { useRef, useEffect } from "react";
import {
  Camera,
  RefreshCw,
  AlertTriangle,
  PlayCircle,
  Eye,
  Activity,
  Scan,
} from "lucide-react";
import type {
  NormalizedLandmark,
  AnthropometricMetrics,
} from "../types/vision.ts";
import { POSE_CONNECTIONS } from "../services/poseLandmarker.ts";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarks: NormalizedLandmark[] | null;
  confidence: number;
  fps: number;
  error: string | null;
  isLoading: boolean;
  isMock: boolean;
  facingMode: "user" | "environment";
  onToggleCamera: () => void;
  onToggleMock: () => void;
  onRetry: () => void;
  anchorHeightCm: number;
  metrics: AnthropometricMetrics | null;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  landmarks,
  confidence,
  fps,
  error,
  isLoading,
  isMock,
  facingMode,
  onToggleCamera,
  onToggleMock,
  onRetry,
  metrics,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render skeleton HUD over video
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

      // Draw cybernetic scanning reticle background if in mock mode
      if (isMock) {
        ctx.fillStyle = "#0B1120";
        ctx.fillRect(0, 0, width, height);

        // Grid lines
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

      // Draw HUD Corner Brackets
      const bSize = 24;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
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

      // Draw skeleton if landmarks are present
      if (landmarks && landmarks.length >= 33) {
        // Transform normalized coordinates to canvas space
        const points = landmarks.map((lm) => ({
          x: (1 - lm.x) * width, // Mirrored for natural selfie perception
          y: lm.y * height,
          z: lm.z,
          v: lm.visibility ?? 1.0,
        }));

        // Draw Skeletal Bone Connections
        ctx.save();
        for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
          const p1 = points[startIndex];
          const p2 = points[endIndex];
          if (!p1 || !p2 || p1.v < 0.35 || p2.v < 0.35) continue;

          // Gradient connection
          const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          grad.addColorStop(0, "rgba(56, 189, 248, 0.85)"); // Cyan
          grad.addColorStop(1, "rgba(16, 185, 129, 0.85)"); // Emerald

          ctx.strokeStyle = grad;
          ctx.lineWidth = 3.5;
          ctx.lineCap = "round";
          ctx.shadowColor = "#38BDF8";
          ctx.shadowBlur = 10;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.restore();

        // Draw Anthropometric Distance Annotations if computed
        if (metrics && metrics.poseDetected) {
          const sLeft = points[11];
          const sRight = points[12];
          if (sLeft && sRight) {
            // Draw biacromial measurement line
            ctx.save();
            ctx.strokeStyle = "#F59E0B"; // Amber
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(sLeft.x, sLeft.y - 12);
            ctx.lineTo(sRight.x, sRight.y - 12);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
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

          // Hips line
          const hLeft = points[23];
          const hRight = points[24];
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

        // Draw Joint Nodes
        points.forEach((pt, idx) => {
          if (pt.v < 0.35) return;

          // Differentiate major joints
          const isMajorJoint = [11, 12, 23, 24, 25, 26, 27, 28].includes(idx);
          const radius = isMajorJoint ? 6 : 4;

          ctx.save();
          // Halo
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius + 3, 0, 2 * Math.PI);
          ctx.fillStyle = isMajorJoint
            ? "rgba(16, 185, 129, 0.3)"
            : "rgba(56, 189, 248, 0.25)";
          ctx.fill();

          // Core
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
  }, [landmarks, isMock, metrics]);

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col">
      {/* Video stream (mirrored) */}
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

      {/* Cybernetic Scanlines */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-40 z-10" />

      {/* HUD Top Bar */}
      <div className="relative z-20 flex items-center justify-between p-3 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent">
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
            <span className="text-slate-300">
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

          {confidence > 0 && (
            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-slate-900/80 rounded-md border border-slate-800 text-[11px] font-mono text-emerald-400">
              <Scan className="w-3 h-3" />
              <span>{(confidence * 100).toFixed(0)}% CONF</span>
            </div>
          )}
        </div>

        {/* Camera controls */}
        <div className="flex items-center space-x-2">
          <button
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

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="p-3 bg-cyan-500/10 rounded-full border border-cyan-500/30 mb-3 animate-spin">
            <RefreshCw className="w-6 h-6 text-cyan-400" />
          </div>
          <p className="text-sm font-mono text-cyan-300">
            Initializing MediaPipe Neural Model...
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Loading WebAssembly Wasm
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
              onClick={onToggleMock}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono transition flex items-center space-x-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Simulate Pose</span>
            </button>
          </div>
        </div>
      )}

      {/* Standby / No Pose Hint */}
      {!isLoading && !error && !landmarks && !isMock && (
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
