import { Camera, Upload, RotateCw, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useCamera } from '../../hooks/useCamera';
import { useSession } from '../../stores/sessionStore';
import { useAIDetection } from '../../hooks/useAIDetection';
import { useState } from 'react';
import type { Photo } from '../../types/models';

export default function CameraPanel() {
  const {
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
  } = useCamera();

  const { addPhoto } = useSession();
  const { processPhoto, isProcessing, error: aiError } = useAIDetection();
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    try {
      setIsCapturing(true);
      const dataUrl = await capturePhoto();

      const photo: Photo = {
        id: uuidv4(),
        dataUrl,
        capturedAt: Date.now(),
        processed: false,
        detections: [],
      };

      addPhoto(photo);

      // Auto-process with AI
      try {
        await processPhoto(photo.id, dataUrl);
      } catch (aiErr) {
        // Error is already set in useAIDetection hook
        console.error('AI processing failed:', aiErr);
      }
    } catch (err) {
      console.error('Failed to capture photo:', err);
      alert('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;

      const photo: Photo = {
        id: uuidv4(),
        dataUrl,
        capturedAt: Date.now(),
        processed: false,
        detections: [],
      };

      addPhoto(photo);

      // Auto-process with AI
      try {
        await processPhoto(photo.id, dataUrl);
      } catch (aiErr) {
        console.error('AI processing failed:', aiErr);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <div className="bg-black rounded-lg overflow-hidden relative aspect-video">
        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Camera not started</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
            <div className="text-center px-4">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        {!isReady ? (
          <>
            <button
              onClick={startCamera}
              disabled={isStarting}
              className="col-span-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              {isStarting ? 'Starting Camera...' : 'Start Camera'}
            </button>

            <label className="col-span-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-5 h-5" />
              Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </>
        ) : (
          <>
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              {isCapturing ? 'Capturing...' : 'Capture'}
            </button>

            {availableCameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <RotateCw className="w-5 h-5" />
                Switch
              </button>
            )}

            <button
              onClick={stopCamera}
              className={`${availableCameras.length > 1 ? 'col-span-2' : 'col-span-1'} px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium`}
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {/* AI Processing Status */}
      {isProcessing && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          Processing with AI...
        </div>
      )}

      {/* AI Error */}
      {aiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
          <AlertCircle className="inline w-4 h-4 mr-2" />
          {aiError}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <p>
          <strong>Tip:</strong> Point camera at shelf section with package stickers visible. Capture
          multiple photos to cover all shelves.
        </p>
      </div>
    </div>
  );
}
