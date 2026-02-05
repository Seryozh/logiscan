import { v4 as uuidv4 } from 'uuid';
import type { Package, ParsingError } from '../types/models';

/**
 * Parses raw package list text into structured Package objects.
 *
 * Expected format (tab or multi-space separated):
 * C01K Unit    ESCARDO ENTERPRISE LLC    UPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO    3901    1/30/2026 6:57:06 PM
 *
 * @param rawText - Raw text pasted from package management system
 * @returns Object containing parsed packages and any errors encountered
 */
export function parsePackageList(rawText: string): {
  packages: Package[];
  errors: ParsingError[];
} {
  const packages: Package[] = [];
  const errors: ParsingError[] = [];
  const seenCombos = new Set<string>(); // Track apt+last4 combos for duplicate detection

  const lines = rawText.split('\n');
  const apartmentRegex = /^(C\d{2}[A-Z])/; // Matches C02G, C14K, etc.

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      return;
    }

    try {
      // Split by tabs first, fallback to 2+ spaces
      let fields: string[];
      if (trimmedLine.includes('\t')) {
        fields = trimmedLine.split('\t').map(f => f.trim());
      } else {
        fields = trimmedLine.split(/\s{2,}/).map(f => f.trim());
      }

      // Need at least 3 fields: apartment, entity, carrier/tracking
      if (fields.length < 3) {
        errors.push({
          lineNumber,
          line: trimmedLine,
          reason: 'Insufficient fields (expected at least 3)'
        });
        return;
      }

      // Field 0: Extract apartment code
      const apartmentMatch = fields[0].match(apartmentRegex);
      if (!apartmentMatch) {
        errors.push({
          lineNumber,
          line: trimmedLine,
          reason: 'Could not find apartment code (expected format: C##L, e.g., C02G)'
        });
        return;
      }
      const apartment = apartmentMatch[1];

      // Field 2: Parse carrier/tracking field
      // Format: "CARRIER - #REFNUM - TRACKINGNUM RECIPIENT NAME"
      const carrierTrackingField = fields[2];
      const parts = carrierTrackingField.split(' - ');

      if (parts.length < 3) {
        errors.push({
          lineNumber,
          line: trimmedLine,
          reason: 'Could not parse carrier/tracking field (expected format: CARRIER - #REF - TRACKING RECIPIENT)'
        });
        return;
      }

      const carrier = parts[0].trim();
      // Part 1 is the internal reference number (ignore)
      const trackingAndRecipient = parts[2].trim();

      // Split tracking and recipient: first token is tracking, rest is recipient name
      const tokens = trackingAndRecipient.split(/\s+/);
      if (tokens.length < 2) {
        errors.push({
          lineNumber,
          line: trimmedLine,
          reason: 'Could not separate tracking number from recipient name'
        });
        return;
      }

      const fullTracking = tokens[0];
      const recipient = tokens.slice(1).join(' ');

      // Extract last 4 characters of tracking
      if (fullTracking.length < 4) {
        errors.push({
          lineNumber,
          line: trimmedLine,
          reason: 'Tracking number too short (need at least 4 characters)'
        });
        return;
      }
      const trackingLast4 = fullTracking.slice(-4);

      // Check for duplicates (same apartment + last4)
      const comboKey = `${apartment}:${trackingLast4}`;
      if (seenCombos.has(comboKey)) {
        errors.push({
          lineNumber,
          line: trimmedLine,
          reason: `Duplicate entry (${apartment} + ${trackingLast4} already exists)`
        });
        return;
      }
      seenCombos.add(comboKey);

      // Create package object
      const pkg: Package = {
        id: uuidv4(),
        apartment,
        trackingLast4,
        carrier,
        recipient,
        fullTracking,
        importedAt: Date.now(),
        status: 'pending'
      };

      packages.push(pkg);

    } catch (error) {
      errors.push({
        lineNumber,
        line: trimmedLine,
        reason: `Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  return { packages, errors };
}
