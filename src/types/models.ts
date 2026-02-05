// Type definitions for the Package Scanner application

export type PackageStatus = 'pending' | 'found' | 'verified' | 'not_found';

export type DetectionStatus = 'matched' | 'duplicate' | 'orphan' | 'unreadable' | 'ambiguous';

export interface BoundingBox {
  x: number;      // percentage 0-100
  y: number;      // percentage 0-100
  width: number;  // percentage 0-100
  height: number; // percentage 0-100
}

export interface Package {
  id: string;
  apartment: string;        // "C02G" - regex: /C\d{2}[A-Z]/
  trackingLast4: string;    // "3728" - last 4 chars of tracking
  carrier: string;          // "AMAZON", "UPS", "FEDEX", etc.
  recipient: string;        // Name on package
  fullTracking: string;     // Complete tracking number
  importedAt: number;       // timestamp
  status: PackageStatus;
}

export interface Detection {
  id: string;
  photoId: string;
  boundingBox: BoundingBox;
  rawText: string;          // Full text AI read from sticker
  parsedApartment: string | null;  // Extracted apartment code
  parsedLast4: string | null;      // Extracted tracking digits
  parsedDate: string | null;       // Extracted arrival date
  parsedInitials: string | null;   // Staff initials
  confidence: number;       // 0-1 confidence score
  matchedPackageId: string | null;
  status: DetectionStatus;
  notes?: string;           // Any issues from AI (optional)
}

export interface Photo {
  id: string;
  dataUrl: string;          // Base64 or blob URL
  capturedAt: number;       // timestamp
  processed: boolean;
  detections: Detection[];
}

export interface SessionState {
  packages: Package[];
  photos: Photo[];
  detections: Detection[];  // Flattened list of all detections from all photos
  sessionId: string;
  createdAt: number;
  lastModified: number;
}

// For parsing errors
export interface ParsingError {
  lineNumber: number;
  line: string;
  reason: string;
}

// AI Detection Response format
export interface AIDetectionResponse {
  detections: Array<{
    raw_text: string;
    apartment: string | null;
    tracking_last4: string | null;
    date: string | null;
    initials: string | null;
    confidence: number;
    bounding_box: [number, number, number, number]; // [x%, y%, width%, height%]
    notes?: string;
  }>;
}

// Pixel-based bounding box (for canvas rendering)
export interface PixelBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
