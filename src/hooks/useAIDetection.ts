import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { detectPackages, DETECTION_SERVICE } from '../services/aiService';
import { detectWithGoogleVision } from '../services/googleVisionService';
import { matchDetections } from '../utils/matchingAlgorithm';
import { loadApiKey, loadGoogleApiKey } from '../utils/localStorage';
import { useSession } from '../stores/sessionStore';
import type { Detection, BoundingBox } from '../types/models';

interface UseAIDetectionReturn {
  processPhoto: (photoId: string, dataUrl: string) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAIDetection(): UseAIDetectionReturn {
  const { state, addDetections, updatePackagesAndDetections } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPhoto = useCallback(
    async (photoId: string, dataUrl: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        let aiResponse;

        // Choose service based on configuration
        if (DETECTION_SERVICE === 'google-vision') {
          // Use Google Cloud Vision API
          const googleApiKey = loadGoogleApiKey();
          if (!googleApiKey) {
            throw new Error(
              'No Google Cloud API key found. Please enter your Google Cloud API key in settings.'
            );
          }

          console.log('Using Google Cloud Vision API');
          aiResponse = await detectWithGoogleVision(dataUrl, googleApiKey);
        } else {
          // Use OpenRouter (default)
          const apiKey = loadApiKey();
          if (!apiKey) {
            throw new Error(
              'No OpenRouter API key found. Please enter your OpenRouter API key in settings.'
            );
          }

          console.log('Using OpenRouter:', DETECTION_SERVICE);
          aiResponse = await detectPackages(dataUrl, apiKey);
        }

        // Debug logging
        console.log('AI Response:', aiResponse);
        console.log('Number of detections:', aiResponse.detections.length);

        // Convert AI response to Detection objects
        const detections: Detection[] = aiResponse.detections.map((det, index) => {
          // Convert bounding box array [x_min, y_min, x_max, y_max] (0-1 normalized)
          // to our format [x%, y%, width%, height%] (0-100 percentages)
          const [x_min, y_min, x_max, y_max] = det.bounding_box;

          console.log(`Detection ${index + 1} raw bbox:`, det.bounding_box);

          // Validate coordinates
          if (x_min >= x_max || y_min >= y_max) {
            console.warn(`Invalid bbox for detection ${index + 1}: x_min=${x_min}, x_max=${x_max}, y_min=${y_min}, y_max=${y_max}`);
          }

          // Convert from normalized (0-1) to percentages (0-100)
          // and from min/max format to x/y/width/height format
          const boundingBox: BoundingBox = {
            x: x_min * 100,
            y: y_min * 100,
            width: (x_max - x_min) * 100,
            height: (y_max - y_min) * 100,
          };

          console.log(`Detection ${index + 1} converted bbox:`, boundingBox);

          return {
            id: uuidv4(),
            photoId,
            boundingBox,
            rawText: det.raw_text,
            parsedApartment: det.apartment,
            parsedLast4: det.tracking_last4,
            parsedDate: det.date,
            parsedInitials: det.initials,
            confidence: det.confidence,
            matchedPackageId: null,
            status: 'matched', // Will be updated by matching algorithm
            notes: det.notes,
          };
        });

        // Add detections to photo (marks photo as processed)
        addDetections(photoId, detections);

        // Run matching algorithm
        const matchResult = matchDetections(state.packages, [
          ...state.detections,
          ...detections,
        ]);

        // Update both packages and detections with match results
        updatePackagesAndDetections(matchResult.updatedPackages, matchResult.updatedDetections);

        console.log(`Processed photo ${photoId}: ${detections.length} detections found`);
      } catch (err) {
        console.error('Failed to process photo:', err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error occurred during photo processing');
        }

        throw err; // Re-throw so caller can handle
      } finally {
        setIsProcessing(false);
      }
    },
    [state.packages, state.detections, addDetections, updatePackagesAndDetections]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    processPhoto,
    isProcessing,
    error,
    clearError,
  };
}
