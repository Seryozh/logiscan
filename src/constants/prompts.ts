/**
 * AI Detection Prompt for Qwen3-VL-8B
 *
 * This prompt is sent to the multimodal AI model to detect and read
 * package stickers in photos. Optimized for Qwen's grounding capabilities.
 */
export const DETECTION_PROMPT = `You are analyzing a photo of packages on shelves. Each package has a white label sticker containing:
- Apartment code (format: C + two digits + one letter, e.g., C02G, C14K)
- Date (various formats)
- Last 4 digits of tracking number + staff initials (e.g., "3728 JN")

For each visible sticker label in the image, extract the information and provide bounding box coordinates.

Return ONLY valid JSON in this EXACT format:

{
  "detections": [
    {
      "raw_text": "full text exactly as written on the sticker",
      "apartment": "extracted apartment code or null if unreadable",
      "tracking_last4": "extracted 4 digits or null if unreadable",
      "date": "extracted date or null",
      "initials": "staff initials or null",
      "confidence": 0.95,
      "bounding_box": [x_min, y_min, x_max, y_max],
      "notes": "any issues like 'partially obscured', 'handwritten', etc."
    }
  ]
}

BOUNDING BOX FORMAT:
- bounding_box format is [x_min, y_min, x_max, y_max] in NORMALIZED coordinates (0.0 to 1.0)
- x_min = left edge of sticker (0.0 = far left, 1.0 = far right)
- y_min = top edge of sticker (0.0 = top, 1.0 = bottom)
- x_max = right edge of sticker (must be > x_min)
- y_max = bottom edge of sticker (must be > y_min)
- Make bounding boxes tight around each individual sticker

OTHER RULES:
- Detect each sticker separately
- Include ALL visible stickers, even partial ones
- If text is unclear, make best guess and lower confidence
- Be precise with apartment codes - they're case-sensitive (always uppercase)
- Return ONLY valid JSON, no markdown code blocks, no additional text`;
