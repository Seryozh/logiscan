import type { AIDetectionResponse } from '../types/models';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

interface Gemini3Config {
  apiKey: string;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  mediaResolution?: 'low' | 'medium' | 'high';
}

/**
 * Detects package stickers using Gemini 3 Flash with Agentic Vision
 *
 * Uses code execution to actively investigate images through multi-step reasoning:
 * 1. Think: Analyze image and formulate detection plan
 * 2. Act: Execute Python code to detect, parse, and annotate stickers
 * 3. Observe: Verify results and refine if needed
 *
 * @param imageDataUrl - Base64 data URL of the image
 * @param config - Configuration including API key and thinking level
 * @returns Promise resolving to standardized detection response
 */
export async function detectWithGemini3Agentic(
  imageDataUrl: string,
  config: Gemini3Config
): Promise<AIDetectionResponse> {
  const { apiKey } = config;
  // Note: thinkingLevel and mediaResolution are configured but not directly used
  // as the API doesn't currently expose these parameters in the request body

  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  // Extract base64 data from data URL
  const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid image data URL format');
  }

  const mimeType = `image/${base64Match[1]}`;
  const base64Data = base64Match[2];

  // Construct detailed prompt for agentic vision
  const prompt = `You are an expert package detection system. Analyze this image and detect all package stickers using code execution.

TASK:
Detect all package stickers and extract structured data from each one.

FOR EACH STICKER, EXTRACT:
1. Apartment code (format: C##L, examples: C08Q, C12A, C05B)
2. Tracking number LAST 4 DIGITS ONLY (examples: 928B, 1234, 5678)
   ⚠️ CRITICAL: DO NOT extract years (2024, 2025, 2026) as tracking numbers!
   ⚠️ Only extract 4-character alphanumeric codes that are NOT years
3. Date if visible (format: MM/DD or MM/DD/YY)
4. Initials if visible (2-3 letters)
5. Bounding box coordinates (normalized 0-1)

USE PYTHON CODE TO:
- Perform OCR/text detection on the image
- Group nearby text blocks that form complete stickers
- Identify apartment codes using regex: C\d{2}[A-Z]
- Find tracking last 4 digits near apartment code (but NOT years!)
- Calculate accurate bounding boxes around each complete sticker
- Validate extracted data (reject years as tracking numbers)
- Draw bounding boxes on image for verification (optional)

IMPORTANT RULES:
- Each sticker has ONE apartment code and ONE tracking number
- Tracking numbers are 4 characters: digits only (1234) OR alphanumeric (928B)
- Years (2024-2029) are NEVER tracking numbers - skip them!
- Bounding box should encompass the entire sticker
- Use normalized coordinates [x_min, y_min, x_max, y_max] in range 0.0 to 1.0
- Confidence should be 0.9+ if both apartment and tracking are found clearly

OUTPUT FORMAT:
Return ONLY a JSON array with this exact structure:
[
  {
    "raw_text": "Complete text from sticker",
    "apartment": "C08Q",
    "tracking_last4": "928B",
    "date": "01/30",
    "initials": "SK",
    "confidence": 0.95,
    "bounding_box": [0.2, 0.3, 0.35, 0.45],
    "notes": "Any relevant observations"
  }
]

If a field is not found or unclear, use null.
If you're unsure about a sticker, set confidence < 0.9 and add notes.

Execute Python code to process the image systematically and return the JSON array.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 1.0, // Keep default for Gemini 3
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        tools: [
          {
            codeExecution: {}, // Enable agentic vision code execution
          },
        ],
        toolConfig: {
          functionCallingConfig: {
            mode: 'AUTO', // Let model decide when to use code execution
          },
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}. ${
          errorData.error?.message || ''
        }`
      );
    }

    const data = await response.json();
    console.log('🤖 Gemini 3 Agentic Vision Response:', data);

    // Parse response
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Gemini 3 Agentic Vision');
    }

    // Check for finish reason issues
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.warn('Unusual finish reason:', candidate.finishReason);
    }

    // Extract text and code execution results from response parts
    let responseText = '';
    let executedCode = false;

    for (const part of candidate.content?.parts || []) {
      if (part.text) {
        responseText += part.text + '\n';
      }

      // Log code execution for debugging
      if (part.executableCode) {
        executedCode = true;
        console.log('📝 Executed Python Code:', part.executableCode.code);
      }

      if (part.codeExecutionResult) {
        console.log('✅ Code Execution Output:', part.codeExecutionResult.output);
        if (part.codeExecutionResult.outcome === 'OUTCOME_OK') {
          responseText += part.codeExecutionResult.output || '';
        } else {
          console.warn('⚠️ Code execution failed:', part.codeExecutionResult);
        }
      }
    }

    console.log('📄 Full Response Text:', responseText);
    console.log('🔧 Used Code Execution:', executedCode);

    // Extract JSON array from response
    // Try multiple patterns to find JSON
    let detections: any[] = [];

    // Pattern 1: Look for JSON array with bracket notation
    const jsonArrayMatch = responseText.match(/\[[\s\S]*?\{[\s\S]*?\}[\s\S]*?\]/);
    if (jsonArrayMatch) {
      try {
        detections = JSON.parse(jsonArrayMatch[0]);
        console.log('✅ Parsed JSON array:', detections);
      } catch (e) {
        console.warn('Failed to parse JSON array match:', e);
      }
    }

    // Pattern 2: Look for ```json code blocks
    if (detections.length === 0) {
      const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try {
          detections = JSON.parse(codeBlockMatch[1]);
          console.log('✅ Parsed JSON from code block:', detections);
        } catch (e) {
          console.warn('Failed to parse JSON from code block:', e);
        }
      }
    }

    // Pattern 3: Try to find any valid JSON array
    if (detections.length === 0) {
      const lines = responseText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('[')) {
          // Try to parse from this line to end
          const jsonAttempt = lines.slice(i).join('\n');
          try {
            const parsed = JSON.parse(jsonAttempt);
            if (Array.isArray(parsed)) {
              detections = parsed;
              console.log('✅ Parsed JSON from line search:', detections);
              break;
            }
          } catch (e) {
            // Continue searching
          }
        }
      }
    }

    if (detections.length === 0) {
      console.warn('⚠️ No detections found in response');
      return { detections: [] };
    }

    // Validate and normalize detection format
    const normalizedDetections = detections.map((det: any, index: number) => {
      // Validate bounding box
      let bbox = det.bounding_box || det.bbox || det.boundingBox;
      if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
        console.warn(`Invalid bounding box for detection ${index}:`, bbox);
        bbox = [0, 0, 1, 1]; // Default to full image
      }

      // Ensure bounding box values are in 0-1 range
      const [x_min, y_min, x_max, y_max] = bbox.map((v: any) => {
        const num = parseFloat(v);
        return isNaN(num) ? 0 : Math.max(0, Math.min(1, num));
      });

      // Validate coordinates
      if (x_min >= x_max || y_min >= y_max) {
        console.warn(`Invalid bbox coordinates for detection ${index}: [${x_min}, ${y_min}, ${x_max}, ${y_max}]`);
      }

      return {
        raw_text: det.raw_text || det.rawText || '',
        apartment: det.apartment || null,
        tracking_last4: det.tracking_last4 || det.trackingLast4 || det.tracking || null,
        date: det.date || null,
        initials: det.initials || null,
        confidence: typeof det.confidence === 'number' ? det.confidence : 0.85,
        bounding_box: [x_min, y_min, x_max, y_max] as [number, number, number, number],
        notes: det.notes || 'Detected by Gemini 3 Agentic Vision',
      };
    });

    console.log(`🎯 Successfully detected ${normalizedDetections.length} stickers`);
    return { detections: normalizedDetections };

  } catch (error) {
    console.error('❌ Gemini 3 Agentic Vision error:', error);

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }

      if (error.message.includes('400')) {
        throw new Error('Invalid request. Check your image format and try again.');
      }

      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Invalid API key or quota exceeded. Check your Gemini API key and billing.');
      }

      if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      throw error;
    }

    throw new Error('Unknown error occurred during Gemini 3 Agentic Vision detection');
  }
}

/**
 * Validates a Gemini API key format
 * Gemini API keys from ai.google.dev start with "AIza" and are 39 characters
 */
export function validateGeminiApiKey(apiKey: string): boolean {
  return apiKey.startsWith('AIza') && apiKey.length === 39;
}
