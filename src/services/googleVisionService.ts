import type { AIDetectionResponse } from '../types/models';

const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

interface GoogleVisionAnnotation {
  description: string;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
}

/**
 * Detects text in an image using Google Cloud Vision API
 *
 * @param imageDataUrl - Base64 data URL of the image
 * @param apiKey - Google Cloud API key
 * @returns Promise resolving to standardized detection response
 */
export async function detectWithGoogleVision(
  imageDataUrl: string,
  apiKey: string
): Promise<AIDetectionResponse> {
  if (!apiKey) {
    throw new Error('Google Cloud API key is required');
  }

  // Extract base64 data from data URL
  const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid image data URL format');
  }

  const base64Data = base64Match[2];

  try {
    const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Data,
            },
            features: [
              {
                type: 'TEXT_DETECTION', // Detects all text with bounding boxes
                maxResults: 50,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Google Vision API error: ${response.status} ${response.statusText}. ${
          errorData.error?.message || ''
        }`
      );
    }

    const data = await response.json();

    if (!data.responses || !data.responses[0]) {
      throw new Error('Invalid response from Google Vision API');
    }

    const visionResponse = data.responses[0];

    if (visionResponse.error) {
      throw new Error(`Google Vision API error: ${visionResponse.error.message}`);
    }

    // Parse text annotations into our detection format
    const annotations: GoogleVisionAnnotation[] = visionResponse.textAnnotations || [];

    if (annotations.length === 0) {
      return { detections: [] };
    }

    // Group text blocks that are likely stickers
    const detections = groupTextIntoStickers(annotations);

    return { detections };
  } catch (error) {
    console.error('Failed to detect with Google Vision:', error);

    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }

      if (error.message.includes('403') || error.message.includes('API key')) {
        throw new Error('Invalid API key or API not enabled. Check your Google Cloud console.');
      }

      if (error.message.includes('429') || error.message.includes('quota')) {
        throw new Error('API quota exceeded. Check your Google Cloud billing.');
      }

      throw error;
    }

    throw new Error('Unknown error occurred during detection');
  }
}

/**
 * Groups detected text blocks into likely sticker regions
 * Uses spatial proximity and text patterns to identify stickers
 */
function groupTextIntoStickers(annotations: GoogleVisionAnnotation[]): any[] {
  // Skip first annotation (it's the full image text)
  const textBlocks = annotations.slice(1);

  if (textBlocks.length === 0) {
    return [];
  }

  // More flexible patterns
  const apartmentRegex = /C\d{2}[A-Z]/i; // Match apartment codes like C12A, C05B
  const trackingRegex = /\d{3,}/; // Match any 3+ digit number (more flexible)

  const detections: any[] = [];
  const usedIndices = new Set<number>();

  // Get image dimensions from first annotation
  const fullImageVertices = annotations[0].boundingPoly.vertices;
  const imageWidth = Math.max(...fullImageVertices.map(v => v.x || 0));
  const imageHeight = Math.max(...fullImageVertices.map(v => v.y || 0));

  textBlocks.forEach((block, index) => {
    if (usedIndices.has(index)) return;

    const text = block.description.trim();
    const aptMatch = text.match(apartmentRegex);

    // Check if this contains an apartment code
    if (aptMatch) {
      const apartment = aptMatch[0].toUpperCase();

      // Try to find nearby tracking number (within next 10 blocks for flexibility)
      let tracking = null;
      let trackingIndex = -1;
      let allRelevantText: string[] = [text];

      for (let i = index + 1; i < Math.min(index + 11, textBlocks.length); i++) {
        if (usedIndices.has(i)) continue;

        const nextText = textBlocks[i].description.trim();
        const trackingMatch = nextText.match(trackingRegex);

        if (trackingMatch) {
          tracking = trackingMatch[0];
          trackingIndex = i;
          allRelevantText.push(nextText);
          break;
        }
      }

      // Create detection even without tracking (could be unreadable)
      const vertices = block.boundingPoly.vertices;
      let allVertices = [...vertices];

      if (trackingIndex >= 0) {
        const trackingVertices = textBlocks[trackingIndex].boundingPoly.vertices;
        allVertices = [...allVertices, ...trackingVertices];
        usedIndices.add(trackingIndex);
      }

      // Calculate bounding box with padding
      const x_coords = allVertices.map(v => v.x || 0);
      const y_coords = allVertices.map(v => v.y || 0);

      let x_min = Math.min(...x_coords) / imageWidth;
      let y_min = Math.min(...y_coords) / imageHeight;
      let x_max = Math.max(...x_coords) / imageWidth;
      let y_max = Math.max(...y_coords) / imageHeight;

      // Add small padding (2% on each side)
      const padX = 0.02;
      const padY = 0.02;
      x_min = Math.max(0, x_min - padX);
      y_min = Math.max(0, y_min - padY);
      x_max = Math.min(1, x_max + padX);
      y_max = Math.min(1, y_max + padY);

      // Extract last 4 digits from tracking if available
      const last4 = tracking ? tracking.slice(-4) : null;

      detections.push({
        raw_text: allRelevantText.join('\n'),
        apartment: apartment,
        tracking_last4: last4,
        date: null,
        initials: null,
        confidence: tracking ? 0.95 : 0.7, // Lower confidence if no tracking found
        bounding_box: [x_min, y_min, x_max, y_max],
        notes: tracking ? 'Detected by Google Cloud Vision' : 'Apartment detected, tracking unreadable',
      });

      usedIndices.add(index);
    }
  });

  console.log(`Google Vision found ${detections.length} stickers from ${textBlocks.length} text blocks`);
  console.log('Detections:', detections);
  return detections;
}

/**
 * Validates a Google Cloud API key format
 */
export function validateGoogleApiKey(apiKey: string): boolean {
  // Google API keys typically start with "AIza" and are 39 characters
  return apiKey.startsWith('AIza') && apiKey.length === 39;
}
