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

  // Simple grouping: Look for blocks that match apartment code pattern
  const apartmentRegex = /^C\d{2}[A-Z]$/i;
  const trackingRegex = /^\d{4}$/;

  const detections: any[] = [];
  const usedIndices = new Set<number>();

  textBlocks.forEach((block, index) => {
    if (usedIndices.has(index)) return;

    const text = block.description.trim();

    // Check if this looks like an apartment code
    if (apartmentRegex.test(text)) {
      // Try to find nearby tracking number (within next 5 blocks)
      let tracking = null;
      let trackingIndex = -1;

      for (let i = index + 1; i < Math.min(index + 6, textBlocks.length); i++) {
        if (usedIndices.has(i)) continue;

        const nextText = textBlocks[i].description.trim();
        if (trackingRegex.test(nextText)) {
          tracking = nextText;
          trackingIndex = i;
          break;
        }
      }

      if (tracking) {
        // Found a sticker! Create detection
        const vertices = block.boundingPoly.vertices;

        // Get image dimensions from first annotation
        const fullImageVertices = annotations[0].boundingPoly.vertices;
        const imageWidth = Math.max(...fullImageVertices.map(v => v.x));
        const imageHeight = Math.max(...fullImageVertices.map(v => v.y));

        // Calculate bounding box (expand to include tracking number)
        const trackingVertices = textBlocks[trackingIndex].boundingPoly.vertices;
        const allVertices = [...vertices, ...trackingVertices];

        const x_min = Math.min(...allVertices.map(v => v.x)) / imageWidth;
        const y_min = Math.min(...allVertices.map(v => v.y)) / imageHeight;
        const x_max = Math.max(...allVertices.map(v => v.x)) / imageWidth;
        const y_max = Math.max(...allVertices.map(v => v.y)) / imageHeight;

        detections.push({
          raw_text: `${text}\n${tracking}`,
          apartment: text.toUpperCase(),
          tracking_last4: tracking,
          date: null,
          initials: null,
          confidence: 0.95,
          bounding_box: [x_min, y_min, x_max, y_max],
          notes: 'Detected by Google Cloud Vision',
        });

        usedIndices.add(index);
        usedIndices.add(trackingIndex);
      }
    }
  });

  console.log(`Google Vision found ${detections.length} stickers`);
  return detections;
}

/**
 * Validates a Google Cloud API key format
 */
export function validateGoogleApiKey(apiKey: string): boolean {
  // Google API keys typically start with "AIza" and are 39 characters
  return apiKey.startsWith('AIza') && apiKey.length === 39;
}
