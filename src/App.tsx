import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity,
  ShieldCheck,
  Cpu,
  Maximize2,
  Video,
  Box,
} from "lucide-react";
import { useWebcam } from "./hooks/useWebcam.ts";
import {
  PoseLandmarkerService,
  generateSyntheticPose,
} from "./services/poseLandmarker.ts";
import { computeAnthropometrics } from "./lib/anthropometrics.ts";
import type {
  NormalizedLandmark,
  AnthropometricMetrics,
} from "./types/vision.ts";
import { CameraView } from "./components/CameraView.tsx";
import { BodyMesh } from "./components/BodyMesh.tsx";
import { MetricsDisplay } from "./components/MetricsDisplay.tsx";

export default function App(): React.JSX.Element {
  const webcam = useWebcam();
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [anchorHeightCm, setAnchorHeightCm] = useState<number>(175);
  const [isImperial, setIsImperial] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<AnthropometricMetrics | null>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"camera" | "3d">("camera");

  const landmarkerServiceRef = useRef(PoseLandmarkerService.getInstance());
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);

  // Initialize MediaPipe PoseLandmarker model
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsModelLoading(true);
      await landmarkerServiceRef.current.init();
      if (isMounted) {
        setIsModelLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Main real-time computer vision inference loop
  const processFrame = useCallback(() => {
    const now = performance.now();

    // Calculate FPS
    frameCountRef.current++;
    if (now - fpsTimerRef.current >= 1000) {
      setFps(
        Math.round(
          (frameCountRef.current * 1000) / (now - fpsTimerRef.current),
        ),
      );
      frameCountRef.current = 0;
      fpsTimerRef.current = now;
    }

    // 1. Simulation / Mock Mode
    if (webcam.isMock) {
      const synthetic = generateSyntheticPose(now / 1000);
      setLandmarks(synthetic);
      setConfidence(0.98);

      const computed = computeAnthropometrics(
        synthetic,
        anchorHeightCm,
        640,
        480,
      );
      setMetrics(computed);
      return;
    }

    // 2. Real Camera Stream Inference
    const video = webcam.videoRef.current;
    if (
      video &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      landmarkerServiceRef.current.isReady()
    ) {
      // Throttle inference slightly to maintain 30-45 FPS smooth loop
      if (now - lastTimeRef.current >= 24) {
        lastTimeRef.current = now;
        const result = landmarkerServiceRef.current.detectForVideo(video, now);

        if (result && result.landmarks && result.landmarks.length > 0) {
          const rawLandmarks = result.landmarks[0];
          if (rawLandmarks && rawLandmarks.length >= 33) {
            setLandmarks(rawLandmarks);

            const vWidth = video.videoWidth || 640;
            const vHeight = video.videoHeight || 480;
            const computed = computeAnthropometrics(
              rawLandmarks,
              anchorHeightCm,
              vWidth,
              vHeight,
            );
            setMetrics(computed);
            setConfidence(computed.confidence);
          }
        } else {
          setLandmarks(null);
          setConfidence(0);
          setMetrics((prev) =>
            prev ? { ...prev, poseDetected: false } : null,
          );
        }
      }
    }
  }, [webcam.isMock, webcam.videoRef, anchorHeightCm]);

  // RequestAnimationFrame loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      processFrame();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [processFrame]);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col selection:bg-cyan-500/30 font-sans">
      {/* Top Cybernetic Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-xl border border-cyan-500/30 text-cyan-400 shadow-neon">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
                  MorphoLens
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  PWA
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
                Client-Side Anthropometric AI & 3D Estimation
              </p>
            </div>
          </div>

          {/* Badges & Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-slate-900/80 rounded-full border border-slate-800 text-xs font-mono text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>WASM SIMD</span>
              <span className="text-slate-600">|</span>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>ZERO CLOUD COMPUTE</span>
            </div>

            <a
              href="https://github.com/FranekJemiolo/morpholens"
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-slate-900/80 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-300 hover:text-white transition"
              title="GitHub Repository"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Mobile View Switcher Tabs */}
        <div className="flex lg:hidden items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex-1 py-2 rounded-lg text-xs font-mono transition flex items-center justify-center space-x-2 ${
              activeTab === "camera"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>OPTICAL TELEMETRY</span>
          </button>
          <button
            onClick={() => setActiveTab("3d")}
            className={`flex-1 py-2 rounded-lg text-xs font-mono transition flex items-center justify-center space-x-2 ${
              activeTab === "3d"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Box className="w-4 h-4" />
            <span>3D ANTHROPO MESH</span>
          </button>
        </div>

        {/* Dual Primary Viewports: Optical Camera & 3D Avatar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Viewport 1: Optical Camera HUD */}
          <div
            className={`${activeTab === "camera" ? "block" : "hidden lg:block"}`}
          >
            <CameraView
              videoRef={webcam.videoRef}
              landmarks={landmarks}
              confidence={confidence}
              fps={fps}
              error={webcam.error}
              isLoading={webcam.isLoading || isModelLoading}
              isMock={webcam.isMock}
              facingMode={webcam.facingMode}
              onToggleCamera={webcam.toggleFacingMode}
              onToggleMock={webcam.toggleMockMode}
              onRetry={webcam.retryCamera}
              anchorHeightCm={anchorHeightCm}
              metrics={metrics}
            />
          </div>

          {/* Viewport 2: 3D Anthropometric Mesh Avatar */}
          <div
            className={`${activeTab === "3d" ? "block" : "hidden lg:block"}`}
          >
            <BodyMesh
              metrics={metrics}
              poseDetected={metrics?.poseDetected ?? false}
            />
          </div>
        </div>

        {/* Real-time Anthropometric Metrics & Controls */}
        <div className="pt-2">
          <MetricsDisplay
            metrics={metrics}
            anchorHeightCm={anchorHeightCm}
            onUpdateAnchorHeight={(h) => setAnchorHeightCm(h)}
            isImperial={isImperial}
            onToggleUnits={() => setIsImperial(!isImperial)}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 mt-auto py-4 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              MorphoLens PWA &bull; Engineered by{" "}
              <a
                href="https://github.com/FranekJemiolo"
                className="text-slate-300 hover:text-cyan-400 underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                Franek Jemiolo
              </a>
            </span>
          </div>
          <div>
            <span>100% Client-Side In-Browser AI &bull; MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
