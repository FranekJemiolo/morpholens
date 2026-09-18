import { useState, useEffect, useRef, useCallback } from "react";
import type { WebcamState } from "../types/vision.ts";

export function useWebcam(initialFacingMode: "user" | "environment" = "user") {
  const [state, setState] = useState<WebcamState>({
    stream: null,
    isLoading: true,
    error: null,
    isMock: false,
    facingMode: initialFacingMode,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing: "user" | "environment", useMock = false) => {
      stopCurrentStream();

      if (useMock) {
        setState((prev) => ({
          ...prev,
          stream: null,
          isLoading: false,
          error: null,
          isMock: true,
          facingMode: facing,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        isMock: false,
        facingMode: facing,
      }));

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("MEDIA_DEVICES_NOT_SUPPORTED");
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: facing,
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
          },
        };

        const mediaStream =
          await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch((playErr) => {
            console.warn("Video auto-play interrupted:", playErr);
          });
        }

        setState({
          stream: mediaStream,
          isLoading: false,
          error: null,
          isMock: false,
          facingMode: facing,
        });
      } catch (err: unknown) {
        let errorMessage = "Unable to access webcam.";

        if (err instanceof DOMException) {
          switch (err.name) {
            case "NotAllowedError":
            case "PermissionDeniedError":
              errorMessage =
                "Camera access denied. Please grant camera permission in your browser settings.";
              break;
            case "NotFoundError":
            case "DevicesNotFoundError":
              errorMessage =
                "No camera hardware detected on this device. Switching to simulation mode is available.";
              break;
            case "NotReadableError":
            case "TrackStartError":
              errorMessage =
                "Camera hardware is currently in use by another application.";
              break;
            case "OverconstrainedError":
              errorMessage =
                "Camera does not satisfy the required resolution constraints.";
              break;
            default:
              errorMessage = `Camera access error: ${err.name}`;
          }
        } else if (
          err instanceof Error &&
          err.message === "MEDIA_DEVICES_NOT_SUPPORTED"
        ) {
          errorMessage =
            "Webcam capture is not supported in this browser environment.";
        }

        console.error("Webcam initialization failed:", err);

        setState({
          stream: null,
          isLoading: false,
          error: errorMessage,
          isMock: false,
          facingMode: facing,
        });
      }
    },
    [stopCurrentStream],
  );

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!active) return;
      await startCamera(state.facingMode, false);
    };
    init();

    return () => {
      active = false;
      stopCurrentStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.facingMode]);

  const toggleFacingMode = useCallback(() => {
    const nextMode = state.facingMode === "user" ? "environment" : "user";
    startCamera(nextMode, state.isMock);
  }, [state.facingMode, state.isMock, startCamera]);

  const toggleMockMode = useCallback(() => {
    const nextMock = !state.isMock;
    startCamera(state.facingMode, nextMock);
  }, [state.isMock, state.facingMode, startCamera]);

  const retryCamera = useCallback(() => {
    startCamera(state.facingMode, false);
  }, [startCamera, state.facingMode]);

  return {
    ...state,
    videoRef,
    toggleFacingMode,
    toggleMockMode,
    retryCamera,
  };
}
