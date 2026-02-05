import { describe, it, expect } from 'vitest';
import { matchDetections } from './matchingAlgorithm';
import type { Package, Detection } from '../types/models';

// Helper to create test packages
function createPackage(apartment: string, last4: string, status: Package['status'] = 'pending'): Package {
  return {
    id: `pkg-${apartment}-${last4}`,
    apartment,
    trackingLast4: last4,
    carrier: 'TEST',
    recipient: 'Test User',
    fullTracking: `TRACK${last4}`,
    importedAt: Date.now(),
    status
  };
}

// Helper to create test detections
function createDetection(
  apartment: string | null,
  last4: string | null,
  photoId: string = 'photo-1'
): Detection {
  return {
    id: `det-${apartment}-${last4}`,
    photoId,
    boundingBox: { x: 0, y: 0, width: 10, height: 10 },
    rawText: `${apartment || 'unknown'}\n${last4 || 'unknown'}`,
    parsedApartment: apartment,
    parsedLast4: last4,
    parsedDate: null,
    parsedInitials: null,
    confidence: 0.95,
    matchedPackageId: null,
    status: 'matched', // Will be updated by algorithm
  };
}

describe('matchDetections', () => {
  describe('Perfect Match Scenarios', () => {
    it('should match detection to package when apartment and last4 match exactly', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections = [createDetection('C01K', '1234')];

      const result = matchDetections(packages, detections);

      expect(result.updatedPackages[0].status).toBe('found');
      expect(result.updatedDetections[0].status).toBe('matched');
      expect(result.updatedDetections[0].matchedPackageId).toBe('pkg-C01K-1234');
    });

    it('should match multiple detections to multiple packages', () => {
      const packages = [
        createPackage('C01K', '1234'),
        createPackage('C02G', '5678'),
        createPackage('C03H', '9012')
      ];
      const detections = [
        createDetection('C01K', '1234'),
        createDetection('C02G', '5678'),
        createDetection('C03H', '9012')
      ];

      const result = matchDetections(packages, detections);

      expect(result.updatedPackages[0].status).toBe('found');
      expect(result.updatedPackages[1].status).toBe('found');
      expect(result.updatedPackages[2].status).toBe('found');

      expect(result.updatedDetections[0].status).toBe('matched');
      expect(result.updatedDetections[1].status).toBe('matched');
      expect(result.updatedDetections[2].status).toBe('matched');
    });

    it('should only match packages with pending status', () => {
      const packages = [
        createPackage('C01K', '1234', 'found'), // Already found
        createPackage('C02G', '1234', 'pending') // Still pending
      ];
      const detections = [createDetection('C01K', '1234')];

      const result = matchDetections(packages, detections);

      // Should not match the already-found package
      expect(result.updatedPackages[0].status).toBe('found'); // Unchanged
      expect(result.updatedDetections[0].status).toBe('duplicate'); // Marked as duplicate
    });
  });

  describe('Duplicate Detection Scenarios', () => {
    it('should mark second detection of same package as duplicate', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections = [
        createDetection('C01K', '1234', 'photo-1'),
        createDetection('C01K', '1234', 'photo-2') // Same sticker in different photo
      ];

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('matched');
      expect(result.updatedDetections[1].status).toBe('duplicate');
      expect(result.updatedPackages[0].status).toBe('found'); // Still only found once
    });

    it('should detect duplicates even if package was already found', () => {
      const packages = [createPackage('C01K', '1234', 'found')]; // Already found
      const detections = [createDetection('C01K', '1234')];

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('duplicate');
    });
  });

  describe('Orphan Detection Scenarios', () => {
    it('should mark detection as orphan when no matching package exists', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections = [createDetection('C02G', '5678')]; // Different apartment/tracking

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('orphan');
      expect(result.updatedDetections[0].notes).toContain('not found in imported package list');
      expect(result.updatedPackages[0].status).toBe('pending'); // Unchanged
    });

    it('should mark as orphan when apartment matches but last4 does not', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections = [createDetection('C01K', '5678')]; // Same apt, different tracking

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('orphan');
    });

    it('should mark as orphan when last4 matches but apartment does not', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections = [createDetection('C02G', '1234')]; // Different apt, same tracking

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('orphan');
    });
  });

  describe('Unreadable Detection Scenarios', () => {
    it('should mark detection as unreadable when both fields are null', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections = [createDetection(null, null)];

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('unreadable');
      expect(result.updatedPackages[0].status).toBe('pending'); // Unchanged
    });

    it('should mark as unreadable when apartment is null', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections = [createDetection(null, '1234')];

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('unreadable');
    });

    it('should mark as unreadable when last4 is null', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections = [createDetection('C01K', null)];

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('unreadable');
    });
  });

  describe('Ambiguous Match Scenarios', () => {
    it('should mark detection as ambiguous when multiple packages match', () => {
      const packages = [
        createPackage('C01K', '1234'), // Same apt + last4
        createPackage('C01K', '1234')  // Duplicate in list (edge case)
      ];
      packages[1].id = 'pkg-C01K-1234-duplicate'; // Different ID

      const detections = [createDetection('C01K', '1234')];

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('ambiguous');
      expect(result.updatedDetections[0].notes).toContain('Multiple packages match');
      expect(result.updatedPackages[0].status).toBe('pending'); // Both stay pending
      expect(result.updatedPackages[1].status).toBe('pending');
    });
  });

  describe('Mixed Scenarios', () => {
    it('should handle mix of matched, duplicate, orphan, and unreadable detections', () => {
      const packages = [
        createPackage('C01K', '1234'),
        createPackage('C02G', '5678', 'found'), // Already found
      ];
      const detections = [
        createDetection('C01K', '1234'),      // Should match
        createDetection('C02G', '5678'),      // Should be duplicate
        createDetection('C03H', '9012'),      // Should be orphan
        createDetection(null, null),          // Should be unreadable
      ];

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('matched');
      expect(result.updatedDetections[1].status).toBe('duplicate');
      expect(result.updatedDetections[2].status).toBe('orphan');
      expect(result.updatedDetections[3].status).toBe('unreadable');

      expect(result.updatedPackages[0].status).toBe('found'); // First package matched
      expect(result.updatedPackages[1].status).toBe('found'); // Second already found
    });

    it('should not mutate original arrays', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections = [createDetection('C01K', '1234')];

      const originalPackageStatus = packages[0].status;
      const originalDetectionStatus = detections[0].status;

      matchDetections(packages, detections);

      // Originals should be unchanged
      expect(packages[0].status).toBe(originalPackageStatus);
      expect(detections[0].status).toBe(originalDetectionStatus);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty package list', () => {
      const packages: Package[] = [];
      const detections = [createDetection('C01K', '1234')];

      const result = matchDetections(packages, detections);

      expect(result.updatedDetections[0].status).toBe('orphan');
    });

    it('should handle empty detection list', () => {
      const packages = [createPackage('C01K', '1234')];
      const detections: Detection[] = [];

      const result = matchDetections(packages, detections);

      expect(result.updatedPackages[0].status).toBe('pending'); // Unchanged
    });

    it('should handle both empty lists', () => {
      const result = matchDetections([], []);

      expect(result.updatedPackages).toHaveLength(0);
      expect(result.updatedDetections).toHaveLength(0);
    });
  });
});
