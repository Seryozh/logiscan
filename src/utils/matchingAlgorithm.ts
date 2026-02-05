import type { Package, Detection } from '../types/models';

/**
 * Matches detections from AI scans to packages in the imported list.
 *
 * Algorithm:
 * 1. For each detection, check if apartment AND last4 are present
 * 2. Find matching packages (apartment + last4 match, status = pending)
 * 3. Handle: exact match, multiple matches, no match, duplicate detection
 * 4. Update package and detection statuses accordingly
 *
 * @param packages - Current package list
 * @param detections - New detections to match
 * @returns Updated packages and detections with new statuses
 */
export function matchDetections(
  packages: Package[],
  detections: Detection[]
): {
  updatedPackages: Package[];
  updatedDetections: Detection[];
} {
  // Create deep copies to avoid mutation
  const updatedPackages = packages.map(pkg => ({ ...pkg }));
  const updatedDetections = detections.map(det => ({ ...det, boundingBox: { ...det.boundingBox } }));

  // Track which apartment+last4 combinations have been matched
  // This includes matches from previous scans AND current scan
  const matchedCombos = new Set<string>();

  // First, populate matchedCombos with already-found packages
  updatedPackages.forEach(pkg => {
    if (pkg.status === 'found' || pkg.status === 'verified') {
      matchedCombos.add(`${pkg.apartment}:${pkg.trackingLast4}`);
    }
  });

  // Process each detection
  updatedDetections.forEach(detection => {
    const { parsedApartment, parsedLast4 } = detection;

    // Case 1: Unreadable - both fields are null
    if (!parsedApartment || !parsedLast4) {
      detection.status = 'unreadable';
      return;
    }

    const comboKey = `${parsedApartment}:${parsedLast4}`;

    // Case 2: Check if this combo was already matched (duplicate detection)
    if (matchedCombos.has(comboKey)) {
      detection.status = 'duplicate';
      return;
    }

    // Find matching packages
    const matchingPackages = updatedPackages.filter(
      pkg =>
        pkg.apartment === parsedApartment &&
        pkg.trackingLast4 === parsedLast4 &&
        pkg.status === 'pending'
    );

    // Case 3: Exactly one match - success!
    if (matchingPackages.length === 1) {
      const pkg = matchingPackages[0];

      // Update package
      pkg.status = 'found';

      // Update detection
      detection.status = 'matched';
      detection.matchedPackageId = pkg.id;

      // Mark this combo as matched
      matchedCombos.add(comboKey);
      return;
    }

    // Case 4: Multiple matches - ambiguous
    if (matchingPackages.length > 1) {
      detection.status = 'ambiguous';
      detection.notes = detection.notes
        ? `${detection.notes}. Multiple packages match this apartment and tracking number.`
        : 'Multiple packages match this apartment and tracking number.';
      return;
    }

    // Case 5: No match - orphan (sticker exists but not in our list)
    detection.status = 'orphan';
    detection.notes = detection.notes
      ? `${detection.notes}. Sticker not found in imported package list.`
      : 'Sticker not found in imported package list.';
  });

  return {
    updatedPackages,
    updatedDetections
  };
}

/**
 * Helper to re-match a specific detection after manual correction.
 * Used when user corrects a detection's parsed values.
 */
export function rematchSingleDetection(
  packages: Package[],
  detection: Detection,
  allDetections: Detection[]
): {
  updatedPackages: Package[];
  updatedDetection: Detection;
} {
  // Get all matched combos from other detections (excluding this one)
  const matchedCombos = new Set<string>();

  packages.forEach(pkg => {
    if (pkg.status === 'found' || pkg.status === 'verified') {
      matchedCombos.add(`${pkg.apartment}:${pkg.trackingLast4}`);
    }
  });

  allDetections.forEach(det => {
    if (det.id !== detection.id && (det.status === 'matched' || det.status === 'duplicate')) {
      if (det.parsedApartment && det.parsedLast4) {
        matchedCombos.add(`${det.parsedApartment}:${det.parsedLast4}`);
      }
    }
  });

  // Match this single detection using same logic
  const result = matchDetections(packages, [detection]);

  return {
    updatedPackages: result.updatedPackages,
    updatedDetection: result.updatedDetections[0]
  };
}
