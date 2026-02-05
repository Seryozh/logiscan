/**
 * AI Service Configuration
 *
 * This file defines which AI detection service is used for package scanning.
 * Currently using Gemini 3 Flash with Agentic Vision for maximum accuracy.
 */

// Detection service type
export type DetectionService = 'gemini-3-agentic';

// Active detection service
export const DETECTION_SERVICE: DetectionService = 'gemini-3-agentic';

/**
 * Gemini 3 Flash with Agentic Vision
 *
 * Features:
 * - Multi-step reasoning through Think → Act → Observe loop
 * - Code execution for accurate parsing and bounding boxes
 * - Self-validation to avoid common errors (e.g., detecting years as tracking numbers)
 * - Spatial reasoning to understand sticker boundaries
 * - Automatic annotation and verification
 *
 * Model: gemini-3-flash-preview
 * API: Google AI (ai.google.dev)
 * Pricing: ~$0.002 per image
 */

// Re-export main detection function from gemini3AgenticVision
export { detectWithGemini3Agentic, validateGeminiApiKey } from './gemini3AgenticVision';
