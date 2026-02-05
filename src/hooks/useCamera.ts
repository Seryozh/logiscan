import { useRef, useState, useCallback, useEffect } from 'react';
import { compressImage } from '../utils/imageCompression';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isReady: boolean;
  isStarting: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<string>;
  switchCamera: () => Promise<void>;
  availableCameras: MediaDeviceInfo[];
  currentCameraId: string | null;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);

  // Get list of available cameras
  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      return cameras;
    } catch (err) {
      console.error('Failed to enumerate cameras:', err);
      return [];
    }
  }, []);

  // Start camera with specific device ID or default
  const startCameraWithDevice = useCallback(
    async (deviceId?: string) => {
      setIsStarting(true);
      setError(null);

      try {
        // Stop existing stream if any
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Request camera access
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                facingMode: 'environment', // Prefer rear camera on mobile
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Attach to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Get actual device ID being used
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        setCurrentCameraId(settings.deviceId || null);

        setIsReady(true);
        setIsStarting(false);

        // Update camera list
        await getCameras();
      } catch (err) {
        console.error('Failed to start camera:', err);

        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            setError('Camera access denied. Please grant permission in your browser settings.');
          } else if (err.name === 'NotFoundError') {
            setError('No camera found on this device.');
          } else if (err.name === 'NotReadableError') {
            setError('Camera is already in use by another application.');
          } else {
            setError(`Failed to start camera: ${err.message}`);
          }
        } else {
          setError('Failed to start camera: Unknown error');
        }

        setIsReady(false);
        setIsStarting(false);
      }
    },
    [getCameras]
  );

  // Start camera with default settings
  const startCamera = useCallback(async () => {
    await startCameraWithDevice();
  }, [startCameraWithDevice]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsReady(false);
    setError(null);
  }, []);

  // Switch to next available camera
  const switchCamera = useCallback(async () => {
    if (availableCameras.length < 2) {
      return; // Can't switch if only one camera
    }

    const currentIndex = availableCameras.findIndex(cam => cam.deviceId === currentCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    await startCameraWithDevice(nextCamera.deviceId);
  }, [availableCameras, currentCameraId, startCameraWithDevice]);

  // Capture photo from video stream
  const capturePhoto = useCallback(async (): Promise<string> => {
    if (!videoRef.current || !canvasRef.current || !isReady) {
      throw new Error('Camera not ready');
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Compress for API
    const compressedDataUrl = await compressImage(dataUrl, 1920, 0.85);

    return compressedDataUrl;
  }, [isReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isReady,
    isStarting,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    availableCameras,
    currentCameraId,
  };
}
