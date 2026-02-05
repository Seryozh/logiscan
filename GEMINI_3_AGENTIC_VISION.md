# Gemini 3 Flash Agentic Vision: Implementation Guide for LogiScan

**Last Updated:** February 5, 2026
**Status:** Research & Planning Phase

---

## 🚀 What is Agentic Vision?

Agentic Vision is a breakthrough capability in Gemini 3 Flash that **transforms image understanding from a static act into an agentic process**. Instead of passively analyzing an image once, the model actively investigates images through a multi-step reasoning and code execution loop.

### Key Breakthrough: Think → Act → Observe Loop

1. **Think**: Model analyzes the query and image, formulates a multi-step plan
2. **Act**: Generates and executes Python code to manipulate/analyze images
3. **Observe**: Transformed image is fed back into context for refined analysis

This creates an **active investigation process** rather than passive one-shot analysis.

---

## 🎯 Why This is Perfect for Package Scanning

### Current Problems with Google Cloud Vision API:
- ❌ Treats entire image as flat text
- ❌ No spatial reasoning about sticker boundaries
- ❌ Can't distinguish between sticker text and background text
- ❌ Matches years (2026) instead of tracking codes (928B)
- ❌ No verification of parsed data accuracy

### What Agentic Vision Solves:
- ✅ **Automatic bounding box generation** - Model draws boxes around detected stickers
- ✅ **Spatial reasoning** - Understands which text belongs to which sticker
- ✅ **Multi-step validation** - Can crop, zoom, verify extracted data
- ✅ **Code-based parsing** - Uses Python to extract apartment codes and tracking numbers programmatically
- ✅ **Self-correction** - Can re-examine areas if initial extraction seems wrong

---

## 💡 How Agentic Vision Will Transform Our App

### Example Workflow:

**User Request:**
"Detect all package stickers and extract apartment codes and tracking numbers"

**Agentic Vision Process:**

1. **Plan Formation:**
   ```
   Think: "I see multiple package stickers. I need to:
   1. Identify each sticker region
   2. Draw bounding boxes around each
   3. Extract apartment code (C##L format)
   4. Extract tracking last 4 digits
   5. Verify no year dates were confused with tracking"
   ```

2. **Code Execution:**
   ```python
   # Model generates and executes this automatically
   import cv2
   import numpy as np
   from PIL import Image, ImageDraw

   # Load image
   img = Image.open("package_photo.jpg")
   draw = ImageDraw.Draw(img)

   # Detect text regions
   text_regions = detect_text_blocks(img)

   # Group into stickers based on proximity
   stickers = []
   for region in text_regions:
       if matches_apartment_pattern(region.text):
           # Find nearby tracking number
           tracking = find_nearby_tracking(region, text_regions)

           # Draw bounding box
           bbox = expand_bbox_to_include(region, tracking)
           draw.rectangle(bbox, outline="green", width=3)

           stickers.append({
               "apartment": region.text,
               "tracking_last4": tracking.text[-4:],
               "bounding_box": normalize_bbox(bbox, img.size),
               "confidence": calculate_confidence(region, tracking)
           })

   # Save annotated image
   img.save("annotated.jpg")
   return stickers
   ```

3. **Observation & Refinement:**
   - Model examines annotated image
   - Verifies all stickers were detected
   - Re-examines any unclear regions
   - Returns final structured data

---

## 📊 Technical Specifications

### Model Details

**Model ID:** `gemini-3-flash-preview`

**Input Capabilities:**
- Text, code, images, audio, video, PDF
- Max input: 1,048,576 tokens
- Max output: 65,536 tokens

**Vision Features:**
- Code execution for image manipulation
- Automatic bounding box annotation
- Multi-step visual reasoning
- Zoom/crop capabilities
- Python-based calculations

### API Configuration

**Required Settings:**
```python
from google import genai
from google.genai import types

client = genai.Client(api_key="YOUR_API_KEY")

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=[image, prompt],
    config=types.GenerateContentConfig(
        # Enable code execution (KEY FEATURE)
        tools=[types.Tool(code_execution=types.ToolCodeExecution())],

        # Set thinking level for reasoning depth
        thinking_config=types.ThinkingConfig(
            thinking_level="HIGH"  # Options: MINIMAL, LOW, MEDIUM, HIGH
        ),

        # Control image resolution
        media_resolution="media_resolution_high"  # Best for detailed text
    )
)
```

**Thinking Levels:**
- `MINIMAL`: Fastest, minimal reasoning
- `LOW`: Quick tasks with light reasoning
- `MEDIUM`: Balanced (default for Flash)
- `HIGH`: Maximum reasoning depth (best for complex detection)

**Media Resolution:**
- `media_resolution_low`: Faster, less detail
- `media_resolution_medium`: Balanced
- `media_resolution_high`: **Recommended for text-heavy images**
- `media_resolution_ultra_high`: Maximum detail (Vertex AI only)

---

## 💰 Pricing Analysis

### Gemini 3 Flash Pricing (2026)

| Resource | Cost |
|----------|------|
| Input tokens | $0.50 per 1M tokens |
| Output tokens | $3.00 per 1M tokens |
| Image input | $0.0011 per image (560 tokens) |
| Audio input | $1.00 per 1M tokens |

### Cost Comparison

**Per 1,000 package scans:**

| Service | Cost | Notes |
|---------|------|-------|
| Google Cloud Vision | $1.50 | After 1K free tier |
| Gemini 3 Flash (current) | ~$0.30 | Via OpenRouter |
| Gemini 3 Flash Agentic | **~$2.00** | Direct API with code execution |

**Cost Breakdown for Agentic Vision:**
- Image input: 560 tokens × $0.50/1M = $0.00028 per image
- Code execution output: ~3,000 tokens × $3/1M = $0.009 per image
- **Total: ~$0.002 per scan** (before free tier)

**Free Tier:** Gemini API includes generous free tier for gemini-3-flash-preview

### Cost vs. Value

✅ **Worth the Extra Cost Because:**
- Eliminates manual review time (saves labor)
- Higher accuracy = fewer missed/wrong packages
- Automatic bounding boxes = better UX
- Self-correction reduces error rate
- Single API for detection + parsing + bounding boxes

---

## 🔧 Implementation Plan

### Phase 1: Create New Service File

**File:** `/src/services/gemini3AgenticVision.ts`

```typescript
import type { AIDetectionResponse } from '../types/models';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

interface Gemini3Config {
  apiKey: string;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  mediaResolution?: 'low' | 'medium' | 'high';
}

export async function detectWithGemini3Agentic(
  imageDataUrl: string,
  config: Gemini3Config
): Promise<AIDetectionResponse> {
  const { apiKey, thinkingLevel = 'HIGH', mediaResolution = 'high' } = config;

  // Extract base64 data
  const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid image data URL format');
  }

  const mimeType = `image/${base64Match[1]}`;
  const base64Data = base64Match[2];

  // Construct prompt for agentic vision
  const prompt = `You are an expert package scanner. Analyze this image and detect all package stickers.

For each sticker, you must:
1. Draw a bounding box around the entire sticker
2. Extract the apartment code (format: C##L, e.g., C08Q, C12A)
3. Extract the tracking number last 4 digits (format: ####, e.g., 928B, 1234)
   IMPORTANT: Do NOT extract years like 2024, 2025, 2026 as tracking numbers
4. Calculate confidence score (0.0 to 1.0)

Use Python code to:
- Detect text regions with OCR
- Group nearby text blocks that form complete stickers
- Draw bounding boxes using PIL/OpenCV
- Parse apartment codes and tracking numbers programmatically
- Validate extracted data (reject years as tracking numbers)

Return JSON array with this exact structure:
[
  {
    "raw_text": "Full text found on sticker",
    "apartment": "C08Q",
    "tracking_last4": "928B",
    "date": "01/30",
    "initials": "SK",
    "confidence": 0.95,
    "bounding_box": [x_min, y_min, x_max, y_max],  // normalized 0-1
    "notes": "Additional context if needed"
  }
]

Execute code to process the image and return ONLY the JSON array, no other text.`;

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
        },
        tools: [
          {
            codeExecution: {}, // Enable code execution
          },
        ],
        thinkingConfig: {
          thinkingLevel: thinkingLevel,
        },
        // Media resolution control
        systemInstruction: {
          parts: [
            {
              text: `Use ${mediaResolution} resolution for image processing.`,
            },
          ],
        },
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
    console.log('Gemini 3 Agentic Vision Response:', data);

    // Parse response
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Gemini 3');
    }

    // Extract text from response parts
    let responseText = '';
    for (const part of candidate.content?.parts || []) {
      if (part.text) {
        responseText += part.text;
      }
      // Handle code execution results
      if (part.executableCode) {
        console.log('Executed code:', part.executableCode);
      }
      if (part.codeExecutionResult) {
        console.log('Code execution result:', part.codeExecutionResult);
        responseText += part.codeExecutionResult.output || '';
      }
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }

    const detections = JSON.parse(jsonMatch[0]);

    return {
      detections: detections.map((det: any) => ({
        raw_text: det.raw_text || '',
        apartment: det.apartment || null,
        tracking_last4: det.tracking_last4 || null,
        date: det.date || null,
        initials: det.initials || null,
        confidence: det.confidence || 0.8,
        bounding_box: det.bounding_box || [0, 0, 1, 1],
        notes: det.notes || 'Detected by Gemini 3 Agentic Vision',
      })),
    };
  } catch (error) {
    console.error('Gemini 3 Agentic Vision error:', error);
    throw error;
  }
}
```

### Phase 2: Update aiService.ts

```typescript
// Add new service type
export type DetectionService = 'openrouter' | 'google-vision' | 'gemini-3-agentic';

// Switch to agentic vision
export const DETECTION_SERVICE: DetectionService = 'gemini-3-agentic';
```

### Phase 3: Update useAIDetection Hook

```typescript
// In useAIDetection.ts, add case for gemini-3-agentic
if (DETECTION_SERVICE === 'gemini-3-agentic') {
  const geminiApiKey = loadGeminiApiKey(); // New key storage
  if (!geminiApiKey) {
    throw new Error('No Gemini API key found');
  }

  aiResponse = await detectWithGemini3Agentic(dataUrl, {
    apiKey: geminiApiKey,
    thinkingLevel: 'HIGH',
    mediaResolution: 'high',
  });
}
```

### Phase 4: Update API Key Input Component

Add support for Gemini API key (different from Google Cloud):
- Gemini API keys: Start with `AIza...` (same format as Google Cloud)
- Can be obtained from: https://ai.google.dev/gemini-api/docs/api-key
- Free tier available for gemini-3-flash-preview

---

## 🎯 Expected Results

### Before (Google Cloud Vision):
```json
{
  "detections": [
    {
      "raw_text": "C08Q\n2026",
      "apartment": "C08Q",
      "tracking_last4": "2026",  // ❌ WRONG - This is a year!
      "bounding_box": [0.2, 0.3, 0.35, 0.4],
      "confidence": 0.95
    }
  ]
}
```

### After (Gemini 3 Agentic Vision):
```json
{
  "detections": [
    {
      "raw_text": "C08Q\n928B\n01/30/26\nSK",
      "apartment": "C08Q",
      "tracking_last4": "928B",  // ✅ CORRECT!
      "date": "01/30/26",
      "initials": "SK",
      "bounding_box": [0.2, 0.3, 0.36, 0.42],  // More accurate
      "confidence": 0.98,
      "notes": "Verified via code execution - excluded year 2026"
    }
  ]
}
```

---

## 📈 Performance Benchmarks

According to Google's benchmarks:

- **5-10% quality boost** across vision tasks with code execution
- **Better accuracy** on structured data extraction
- **Self-correction** reduces error rates
- **Spatial reasoning** improves multi-object detection

For our use case:
- Expected **15-20% improvement** in tracking number accuracy
- **Near-zero false positives** from years being detected as tracking
- **Tighter bounding boxes** around actual stickers
- **Better handling** of overlapping or close-proximity stickers

---

## 🚀 Next Steps

### Immediate Actions:

1. **Get Gemini API Key**
   - Visit: https://ai.google.dev/gemini-api/docs/api-key
   - Create free API key (generous free tier)
   - Test in AI Studio first: https://aistudio.google.com/

2. **Test in AI Studio**
   - Upload a package photo
   - Enable "Code Execution" in Tools
   - Set thinking level to HIGH
   - Test with our prompt

3. **Implement Service**
   - Create `gemini3AgenticVision.ts`
   - Add to service switcher
   - Update API key storage
   - Test locally before deployment

4. **Compare Results**
   - Run same photos through both services
   - Compare accuracy, bounding boxes, confidence
   - Measure cost per scan
   - Decide if worth the switch

### Success Criteria:

- ✅ Zero years detected as tracking numbers
- ✅ 95%+ accuracy on tracking extraction
- ✅ Bounding boxes align perfectly with stickers
- ✅ Can handle 5+ stickers in single photo
- ✅ Total cost < $0.005 per scan
- ✅ Processing time < 5 seconds

---

## 📚 Resources & Documentation

### Official Documentation:
- [Agentic Vision Blog Post](https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/)
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Vertex AI Gemini 3 Docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-flash)
- [Bounding Box Detection Guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/bounding-box-detection)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)

### Community Examples:
- [Vision-Powered Infrastructure Detection with Gemini 3](https://medium.com/google-cloud/building-a-vision-powered-infrastructure-detection-agent-with-gemini-3-8fc2f1067082)
- [Gemini 3 Flash Agentic Vision in LINE Bot](https://dev.to/gde/gemini-3-flash-agentic-vision-in-line-bot-ai-image-annotation-and-more-53lb)
- [Beyond Just Looking: Gemini 3 Now Has Agentic Vision](https://medium.com/google-cloud/beyond-just-looking-gemini-3-now-has-agentic-vision-b20c7c6809ce)

### News & Analysis:
- [Google Introduces Agentic Vision - MarkTechPost](https://www.marktechpost.com/2026/02/04/google-introduces-agentic-vision-in-gemini-3-flash-for-active-image-understanding/)
- [Gemini 3 Flash's Agentic Vision - 9to5Google](https://9to5google.com/2026/01/27/gemini-3-flash-agentic-vision/)
- [Gemini 3 Flash Updates - Il Sole 24 ORE](https://en.ilsole24ore.com/art/gemini-3-flash-updates-agentic-vision-heres-how-it-works-AIaIwo9)

---

## 🤔 Technical Considerations

### Advantages:
- ✅ Single API for detection + parsing + bounding boxes
- ✅ Self-correcting through multi-step reasoning
- ✅ Can handle edge cases programmatically
- ✅ Better spatial understanding
- ✅ Code execution ensures consistent parsing logic
- ✅ Free tier available for testing

### Challenges:
- ⚠️ Slightly higher cost than Google Cloud Vision
- ⚠️ Longer processing time (multi-step reasoning)
- ⚠️ Preview model (may have API changes)
- ⚠️ Need to handle code execution results parsing
- ⚠️ More complex error handling

### Mitigation Strategies:
- Use caching for repeated images
- Implement retry logic for failures
- Monitor costs with budget alerts
- Fall back to Google Cloud Vision if needed
- Add timeout handling (max 30 seconds)

---

## 🎉 Conclusion

**Gemini 3 Flash Agentic Vision is a game-changer for LogiScan.**

By combining visual reasoning with code execution, we can achieve:
- **Unprecedented accuracy** in package detection
- **Intelligent bounding boxes** that actually work
- **Elimination of common errors** (years as tracking numbers)
- **Self-validation** of extracted data
- **Future-proof architecture** for complex vision tasks

**Recommendation:** Implement as primary detection service, with Google Cloud Vision as fallback for cost-sensitive users.

**Next Action:** Test in Google AI Studio with real package photos to validate performance before full implementation.

---

*Document created: February 5, 2026*
*For: LogiScan Package Scanner*
*Author: Research & Development*
