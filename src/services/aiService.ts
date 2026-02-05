import { DETECTION_PROMPT } from '../constants/prompts';
import type { AIDetectionResponse } from '../types/models';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Detection service to use
export type DetectionService = 'openrouter' | 'google-vision';
export const DETECTION_SERVICE: DetectionService = 'google-vision'; // Change to 'google-vision' to use Google Cloud

// Available OpenRouter models (used when DETECTION_SERVICE = 'openrouter'):
// const MODEL = 'qwen/qwen3-vl-8b-instruct'; // Qwen3-VL-8B: $0.08/M, good at grounding
const MODEL = 'google/gemini-2.5-flash'; // Gemini 2.5 Flash: $0.30/M, excellent OCR
// const MODEL = 'qwen/qwen3-vl-32b-instruct'; // Qwen3-VL-32B: $0.50/M, highest accuracy
// const MODEL = 'google/gemini-2.5-pro'; // Gemini 2.5 Pro: $1.25/M, best reasoning

/**
 * Detects package stickers in an image using Gemini 2.0 Flash via OpenRouter
 *
 * @param imageDataUrl - Base64 data URL of the image
 * @param apiKey - OpenRouter API key
 * @returns Promise resolving to AI detection response
 */
export async function detectPackages(
  imageDataUrl: string,
  apiKey: string
): Promise<AIDetectionResponse> {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  // Extract base64 data from data URL
  const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid image data URL format');
  }

  const imageType = base64Match[1];
  const base64Data = base64Match[2];

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://logiscan.me',
        'X-Title': 'LogiScan Package Scanner',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: DETECTION_PROMPT,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/${imageType};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1, // Low temperature for more consistent/accurate results
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}. ${
          errorData.error?.message || ''
        }`
      );
    }

    const data = await response.json();

    // Extract the response text
    const contentText = data.choices?.[0]?.message?.content;
    if (!contentText) {
      throw new Error('No content in API response');
    }

    // Parse the JSON response from the AI
    // The AI should return valid JSON, but we need to extract it if wrapped in markdown
    let jsonText = contentText.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const detectionResponse: AIDetectionResponse = JSON.parse(jsonText);

    // Validate response structure
    if (!detectionResponse.detections || !Array.isArray(detectionResponse.detections)) {
      throw new Error('Invalid response structure: missing detections array');
    }

    return detectionResponse;
  } catch (error) {
    console.error('Failed to detect packages:', error);

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }

      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('Invalid API key. Please check your OpenRouter API key.');
      }

      if (error.message.includes('429') || error.message.includes('Rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      if (error.message.includes('JSON')) {
        throw new Error('AI returned invalid response format. Please try again.');
      }

      throw error;
    }

    throw new Error('Unknown error occurred during detection');
  }
}

/**
 * Validates an OpenRouter API key format (basic check)
 */
export function validateApiKey(apiKey: string): boolean {
  // OpenRouter keys start with "sk-or-"
  return apiKey.startsWith('sk-or-') && apiKey.length > 20;
}
