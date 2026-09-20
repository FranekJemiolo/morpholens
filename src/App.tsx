import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity,
  ShieldCheck,
  Cpu,
  Maximize2,
  Video,
  Box,
  PlayCircle,
  Trophy,
} from "lucide-react";
import { useWebcam } from "./hooks/useWebcam.ts";
import {
  PoseLandmarkerService,
  generateSyntheticPose,
} from "./services/poseLandmarker.ts";
import {
  computeAnthropometrics,
  evaluatePoseQuality,
  extractFrontMeasurements,
  extractSideMeasurements,
  fuseMultiAngleAnthropometrics,
  detectBiologicalSex,
} from "./lib/anthropometrics.ts";
import { PoseTemporalFilter } from "./lib/filters/oneEuroFilter.ts";
import { feedback } from "./lib/feedback/audioHaptics.ts";
import type {
  NormalizedLandmark,
  AnthropometricMetrics,
  CaptureStage,
  PoseQualityAssessment,
  FrontViewMeasurements,
  SideViewMeasurements,
} from "./types/vision.ts";
import { CameraView } from "./components/CameraView.tsx";
import { BodyMesh } from "./components/BodyMesh.tsx";
import { MetricsDisplay } from "./components/MetricsDisplay.tsx";
import { SAMPLE_HUMANS } from "./services/samplePresets.ts";
import { CelebrityBenchmarkModal } from "./components/CelebrityBenchmarkModal.tsx";
import {
  type CelebrityBenchmark,
  generateCelebrityLandmarks,
} from "./services/celebrityBenchmarks.ts";

export default function App(): React.JSX.Element {
  const webcam = useWebcam(false);

  // Persistent user preferences
  const [anchorHeightCm, setAnchorHeightCm] = useState<number>(() => {
    const saved = localStorage.getItem("morpholens_anchor_height");
    return saved ? parseFloat(saved) : 175;
  });

  const [isImperial, setIsImperial] = useState<boolean>(() => {
    return localStorage.getItem("morpholens_is_imperial") === "true";
  });

  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [metrics, setMetrics] = useState<AnthropometricMetrics | null>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"camera" | "3d">("camera");

  // Multi-Angle Guided Capture State Machine
  const [captureStage, setCaptureStage] = useState<CaptureStage>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [quality, setQuality] = useState<PoseQualityAssessment | null>(null);

  // Sample Human Presets
  const [samplePresetId, setSamplePresetId] = useState<string | null>(null);
  const [sampleImageUrl, setSampleImageUrl] = useState<string | null>(null);
  const [customOrientation, setCustomOrientation] = useState<"front" | "side">(
    "front",
  );
  const [sampleDimensions, setSampleDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 640, height: 480 });
  const sampleImageRef = useRef<HTMLImageElement | null>(null);

  const frontSnapshotRef = useRef<FrontViewMeasurements | null>(null);
  const sideSnapshotRef = useRef<SideViewMeasurements | null>(null);

  const landmarkerServiceRef = useRef(PoseLandmarkerService.getInstance());
  const temporalFilterRef = useRef(
    new PoseTemporalFilter({ minCutoff: 1.0, beta: 0.007 }),
  );
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Save preferences
  const handleUpdateAnchorHeight = (heightCm: number) => {
    setAnchorHeightCm(heightCm);
    localStorage.setItem("morpholens_anchor_height", heightCm.toString());
  };

  const handleToggleUnits = () => {
    const next = !isImperial;
    setIsImperial(next);
    localStorage.setItem("morpholens_is_imperial", next.toString());
  };

  // Biological Sex state with localStorage persistence and manual override flag
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female">(() => {
    const saved = localStorage.getItem("morpholens_biological_sex");
    return saved === "female" ? "female" : "male";
  });
  const [isSexManuallySet, setIsSexManuallySet] = useState<boolean>(() => {
    return !!localStorage.getItem("morpholens_biological_sex");
  });

  const handleToggleSex = useCallback((newSex?: "male" | "female") => {
    setBiologicalSex((prev) => {
      const next = newSex || (prev === "male" ? "female" : "male");
      localStorage.setItem("morpholens_biological_sex", next);
      setIsSexManuallySet(true);
      return next;
    });
  }, []);

  const handleImageLoad = useCallback((w: number, h: number) => {
    setSampleDimensions({ width: w, height: h });
  }, []);

  const toggleCustomOrientation = useCallback(() => {
    setCustomOrientation((prev) => (prev === "front" ? "side" : "front"));
  }, []);

  const [isCelebrityModalOpen, setIsCelebrityModalOpen] = useState(false);
  const [selectedCelebrity, setSelectedCelebrity] =
    useState<CelebrityBenchmark | null>(null);

  const handleStartLiveCamera = useCallback(() => {
    if (sampleImageUrl) {
      setSamplePresetId(null);
      setSampleImageUrl(null);
      setLandmarks(null);
      setMetrics(null);
    }
    setSelectedCelebrity(null);
    webcam.startLiveCamera();
  }, [sampleImageUrl, webcam]);

  const handleStopLiveCamera = useCallback(() => {
    webcam.stopLiveCamera();
    setLandmarks(null);
    setMetrics(null);
    setSelectedCelebrity(null);
  }, [webcam]);

  const handleSelectSample = useCallback(
    (presetId: string | null, customUrl?: string) => {
      if (webcam.isLiveCameraActive) {
        webcam.stopLiveCamera();
      }
      setSelectedCelebrity(null);

      if (!presetId) {
        setSamplePresetId(null);
        setSampleImageUrl(null);
        setLandmarks(null);
        setMetrics(null);
        return;
      }

      if (presetId === "custom" && customUrl) {
        setSamplePresetId("custom");
        setSampleImageUrl(customUrl);
        setCustomOrientation("front");
        return;
      }

      const preset = SAMPLE_HUMANS.find((s) => s.id === presetId);
      if (preset) {
        const baseUrl = import.meta.env.BASE_URL || "./";
        const fullUrl = `${baseUrl.replace(/\/$/, "")}/${preset.path}`;
        setSamplePresetId(preset.id);
        setSampleImageUrl(fullUrl);
        setCustomOrientation(preset.orientation);
        setAnchorHeightCm(preset.suggestedHeightCm);
        if (!isSexManuallySet) {
          setBiologicalSex(preset.gender);
        }
      }
    },
    [webcam, isSexManuallySet],
  );

  const handleSelectCelebrity = useCallback(
    (benchmark: CelebrityBenchmark) => {
      if (webcam.isLiveCameraActive) {
        webcam.stopLiveCamera();
      }
      setSamplePresetId(null);
      setSampleImageUrl(null);
      setSelectedCelebrity(benchmark);
      setAnchorHeightCm(benchmark.heightCm);
      setBiologicalSex(benchmark.gender);
      setIsSexManuallySet(true);

      const vWidth = 640;
      const vHeight = 480;
      const synthesizedLandmarks = generateCelebrityLandmarks(
        benchmark,
        vWidth,
        vHeight,
      );
      setLandmarks(synthesizedLandmarks);

      const calculatedMetrics = computeAnthropometrics(
        synthesizedLandmarks,
        benchmark.heightCm,
        vWidth,
        vHeight,
        benchmark.gender,
      );
      setMetrics(calculatedMetrics);

      const q = evaluatePoseQuality(synthesizedLandmarks, "front");
      setQuality(q);
      feedback.playCaptureChime();
    },
    [webcam],
  );

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

  // Guided Scan Controller
  const startGuidedScan = useCallback(() => {
    setCaptureStage("front_aligning");
    setCountdown(null);
    frontSnapshotRef.current = null;
    sideSnapshotRef.current = null;
  }, []);

  const resetScan = useCallback(() => {
    setCaptureStage("idle");
    setCountdown(null);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // Execute snapshot capture for current angle
  const executeCapture = useCallback(
    (currentLandmarks: NormalizedLandmark[]) => {
      const vWidth = sampleImageUrl
        ? sampleDimensions.width
        : webcam.videoWidth || 640;
      const vHeight = sampleImageUrl
        ? sampleDimensions.height
        : webcam.videoHeight || 480;

      if (captureStage === "front_countdown") {
        feedback.playCaptureChime();
        const front = extractFrontMeasurements(
          currentLandmarks,
          anchorHeightCm,
          vWidth,
          vHeight,
        );
        frontSnapshotRef.current = front;
        setCaptureStage("side_prompt");

        // Transition to side view after short delay
        setTimeout(() => {
          setCaptureStage("side_aligning");
        }, 2200);
      } else if (captureStage === "side_countdown") {
        feedback.playCaptureChime();
        const side = extractSideMeasurements(
          currentLandmarks,
          frontSnapshotRef.current?.scaleFactor || 0.4,
          vWidth,
          vHeight,
        );
        sideSnapshotRef.current = side;

        // Fuse front and side
        if (frontSnapshotRef.current) {
          const fused = fuseMultiAngleAnthropometrics(
            frontSnapshotRef.current,
            side,
            anchorHeightCm,
            biologicalSex,
          );
          setMetrics(fused);
        }
        setCaptureStage("completed");
      }
    },
    [
      captureStage,
      webcam.videoWidth,
      webcam.videoHeight,
      anchorHeightCm,
      biologicalSex,
    ],
  );

  // Trigger countdown when alignment is locked
  useEffect(() => {
    if (!quality || !quality.isValid) {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
      }
      return;
    }

    if (
      captureStage === "front_aligning" &&
      quality.alignmentState === "locked"
    ) {
      const trigger = setTimeout(() => {
        setCaptureStage("front_countdown");
        let count = 3;
        setCountdown(count);
        feedback.playCountdownTick();

        countdownTimerRef.current = setInterval(() => {
          count--;
          if (count > 0) {
            setCountdown(count);
            feedback.playCountdownTick();
          } else {
            clearInterval(countdownTimerRef.current!);
            countdownTimerRef.current = null;
            setCountdown(null);
            if (landmarks) {
              executeCapture(landmarks);
            }
          }
        }, 1000);
      }, 0);

      return () => clearTimeout(trigger);
    } else if (
      captureStage === "side_aligning" &&
      quality.alignmentState === "locked"
    ) {
      const trigger = setTimeout(() => {
        setCaptureStage("side_countdown");
        let count = 3;
        setCountdown(count);
        feedback.playCountdownTick();

        countdownTimerRef.current = setInterval(() => {
          count--;
          if (count > 0) {
            setCountdown(count);
            feedback.playCountdownTick();
          } else {
            clearInterval(countdownTimerRef.current!);
            countdownTimerRef.current = null;
            setCountdown(null);
            if (landmarks) {
              executeCapture(landmarks);
            }
          }
        }, 1000);
      }, 0);

      return () => clearTimeout(trigger);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [quality, captureStage, landmarks, executeCapture]);

  // Main real-time computer vision inference loop
  const processFrame = useCallback(() => {
    const now = performance.now();

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

    // 1. Sample Human Subject Image Inference
    if (sampleImageUrl && sampleImageRef.current) {
      const img = sampleImageRef.current;
      if (
        img.complete &&
        img.naturalWidth > 0 &&
        landmarkerServiceRef.current.isReady()
      ) {
        if (now - lastTimeRef.current >= 30) {
          lastTimeRef.current = now;
          const result = landmarkerServiceRef.current.detectForVideo(img, now);

          if (result && result.landmarks && result.landmarks.length > 0) {
            const rawLandmarks = result.landmarks[0];
            if (rawLandmarks && rawLandmarks.length >= 33) {
              if (!isSexManuallySet) {
                const autoSex = detectBiologicalSex(rawLandmarks);
                if (autoSex !== biologicalSex) {
                  setBiologicalSex(autoSex);
                }
              }
              const smoothed = temporalFilterRef.current.filter(
                rawLandmarks,
                now,
              );
              setLandmarks(smoothed);

              const vWidth = img.naturalWidth || sampleDimensions.width;
              const vHeight = img.naturalHeight || sampleDimensions.height;

              const isSide =
                samplePresetId === "male-side" ||
                (samplePresetId === "custom" && customOrientation === "side") ||
                captureStage.startsWith("side");
              const q = evaluatePoseQuality(
                smoothed,
                isSide ? "side" : "front",
              );
              setQuality(q);
              setConfidence(Math.max(0.9, q.qualityScore / 100));

              if (captureStage === "idle" || captureStage === "completed") {
                const computed = computeAnthropometrics(
                  smoothed,
                  anchorHeightCm,
                  vWidth,
                  vHeight,
                  biologicalSex,
                );
                setMetrics(computed);
              }
            }
          }
        }
      }
      return;
    }

    // 2. Simulation / Mock Mode
    if (webcam.isMock) {
      const isSide = captureStage.startsWith("side");
      const synthetic = generateSyntheticPose(now / 1000, 1.0);
      const filtered = temporalFilterRef.current.filter(synthetic, now);
      setLandmarks(filtered);
      setConfidence(0.98);

      const stage = isSide ? "side" : "front";
      const q = evaluatePoseQuality(filtered, stage);
      setQuality(q);

      if (captureStage === "idle" || captureStage === "completed") {
        const computed = computeAnthropometrics(
          filtered,
          anchorHeightCm,
          webcam.videoWidth,
          webcam.videoHeight,
          biologicalSex,
        );
        setMetrics(computed);
      }
      return;
    }

    // 2. Real Camera Stream Inference
    const video = webcam.videoRef.current;
    if (
      video &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      landmarkerServiceRef.current.isReady()
    ) {
      if (now - lastTimeRef.current >= 24) {
        lastTimeRef.current = now;
        const result = landmarkerServiceRef.current.detectForVideo(video, now);

        if (result && result.landmarks && result.landmarks.length > 0) {
          const rawLandmarks = result.landmarks[0];
          if (rawLandmarks && rawLandmarks.length >= 33) {
            if (!isSexManuallySet) {
              const autoSex = detectBiologicalSex(rawLandmarks);
              if (autoSex !== biologicalSex) {
                setBiologicalSex(autoSex);
              }
            }
            // Apply 1€ temporal smoothing filter
            const smoothed = temporalFilterRef.current.filter(
              rawLandmarks,
              now,
            );
            setLandmarks(smoothed);

            const vWidth = video.videoWidth || 640;
            const vHeight = video.videoHeight || 480;

            const isSide = captureStage.startsWith("side");
            const q = evaluatePoseQuality(smoothed, isSide ? "side" : "front");
            setQuality(q);
            setConfidence(q.qualityScore / 100);

            // Compute live metrics if not mid-capture
            if (captureStage === "idle" || captureStage === "completed") {
              const computed = computeAnthropometrics(
                smoothed,
                anchorHeightCm,
                vWidth,
                vHeight,
                biologicalSex,
              );
              setMetrics(computed);
            }
          }
        } else {
          setLandmarks(null);
          setConfidence(0);
          setQuality(null);
          setMetrics((prev) =>
            prev ? { ...prev, poseDetected: false } : null,
          );
        }
      }
    }
  }, [
    webcam.isMock,
    webcam.videoRef,
    webcam.videoWidth,
    webcam.videoHeight,
    anchorHeightCm,
    captureStage,
    sampleImageUrl,
    samplePresetId,
    sampleDimensions.width,
    sampleDimensions.height,
    customOrientation,
  ]);

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
      {/* Cybernetic Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  1€ FILTERED
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
                Client-Side Anthropometric AI & 3D Estimation
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Developer / Demo Simulator Mode button */}
            <button
              data-testid="btn-simulate"
              onClick={() => {
                if (sampleImageUrl) {
                  handleSelectSample(null);
                }
                setSelectedCelebrity(null);
                webcam.toggleMockMode();
              }}
              title={
                webcam.isMock
                  ? "Stop Simulation (Return to Normal Mode)"
                  : "Run Synthetic Biometric Simulation (Demo / Test)"
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition flex items-center space-x-1.5 ${
                webcam.isMock
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-neon"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700 hover:border-cyan-500/40"
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{webcam.isMock ? "SIMULATING" : "SIMULATE"}</span>
            </button>

            {/* 20 Celebrity Benchmarks button */}
            <button
              data-testid="btn-open-benchmarks"
              onClick={() => setIsCelebrityModalOpen(true)}
              title="Open 20 Verified Celebrity & Extreme Calibration Benchmarks"
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition flex items-center space-x-1.5 ${
                selectedCelebrity
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-neon"
                  : "bg-slate-900/80 hover:bg-slate-800 text-amber-400/90 hover:text-amber-300 border-amber-500/30 hover:border-amber-400/60"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">BENCHMARKS</span>
            </button>

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

      {/* Main Dashboard */}
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
          <div
            className={`${activeTab === "camera" ? "block" : "hidden lg:block"}`}
          >
            <CameraView
              videoRef={webcam.videoRef}
              sampleImageRef={sampleImageRef}
              samplePresetId={samplePresetId}
              sampleImageUrl={sampleImageUrl}
              onSelectSample={handleSelectSample}
              landmarks={landmarks}
              confidence={confidence}
              fps={fps}
              error={webcam.error}
              isLoading={webcam.isLoading || isModelLoading}
              isMock={webcam.isMock}
              facingMode={webcam.facingMode}
              videoWidth={
                sampleImageUrl ? sampleDimensions.width : webcam.videoWidth
              }
              videoHeight={
                sampleImageUrl ? sampleDimensions.height : webcam.videoHeight
              }
              onImageLoad={handleImageLoad}
              customOrientation={customOrientation}
              onToggleCustomOrientation={toggleCustomOrientation}
              onToggleCamera={webcam.toggleFacingMode}
              onToggleMock={() => {
                if (sampleImageUrl) {
                  handleSelectSample(null);
                }
                webcam.toggleMockMode();
              }}
              onRetry={webcam.retryCamera}
              isLiveCameraActive={webcam.isLiveCameraActive}
              onStartLiveCamera={handleStartLiveCamera}
              onStopLiveCamera={handleStopLiveCamera}
              anchorHeightCm={anchorHeightCm}
              metrics={metrics}
              captureStage={captureStage}
              countdown={countdown}
              quality={quality}
              onStartGuidedScan={startGuidedScan}
              onResetScan={resetScan}
              biologicalSex={biologicalSex}
              onToggleSex={handleToggleSex}
              onOpenBenchmarks={() => setIsCelebrityModalOpen(true)}
              activeCelebrityName={selectedCelebrity?.name ?? null}
            />
          </div>

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
            onUpdateAnchorHeight={handleUpdateAnchorHeight}
            isImperial={isImperial}
            onToggleUnits={handleToggleUnits}
            biologicalSex={biologicalSex}
            onToggleSex={handleToggleSex}
          />
        </div>
      </main>

      {/* 20 Celebrity & Extreme Calibration Benchmark Modal */}
      <CelebrityBenchmarkModal
        isOpen={isCelebrityModalOpen}
        onClose={() => setIsCelebrityModalOpen(false)}
        onSelectCelebrity={handleSelectCelebrity}
        currentSelectedId={selectedCelebrity?.id}
      />

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
