import { v4 as uuidv4 } from 'uuid';
import type { Package, ParsingError } from '../types/models';

/**
 * Parses raw package list text into structured Package objects.
 *
 * Expected formats:
 * - Tab/multi-space separated: C01K Unit    ESCARDO LLC    UPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO    3901    1/30/2026 6:57:06 PM
 * - Single-space separated: N01C Unit OFFICE 609 LLC USPS - #2167439815 - 420330199361289719660506103530 Gustavo Cuina 3801 2/4/2026 7:04:53 PM
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
  // Flexible apartment regex: accepts C##X, N##X, or any letter + 2 digits + letter
  const apartmentRegex = /^([A-Z]\d{2}[A-Z])/i; // Matches C02G, N14K, A05B, etc.

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      return;
    }

    try {
      let apartment: string;
      let carrierTrackingField: string;

      // Try to find the reference number pattern (#1234567)
      // The format is: "CARRIER - #REFNUM - TRACKING"
      // So we look for the pattern " - #" which precedes the reference number
      const carrierRefPattern = /\s+-\s+(#\d+)/;
      const carrierRefMatch = trimmedLine.match(carrierRefPattern);

      if (carrierRefMatch && carrierRefMatch.index !== undefined) {
        // Found " - #REFNUM" pattern
        // Everything before this point contains: apartment, "Unit", entity name, carrier
        const beforeCarrierRef = trimmedLine.substring(0, carrierRefMatch.index);
        // Everything from " - #REFNUM" onwards
        const fromCarrierRef = trimmedLine.substring(carrierRefMatch.index).trim();

        // Extract apartment from the beginning
        const apartmentMatch = beforeCarrierRef.match(apartmentRegex);
        if (!apartmentMatch) {
          errors.push({
            lineNumber,
            line: trimmedLine,
            reason: `No valid apartment code found at start of line (expected format: C##L, N##L, etc.)`
          });
          return;
        }
        apartment = apartmentMatch[1].toUpperCase();

        // Now we need to extract the carrier name from beforeCarrierRef
        // The carrier is the last "word" (or words) before the " - #"
        // We need to find where the carrier starts - after the entity name
        // Strategy: look for common carriers working backwards, or just take the last word(s)

        // Get the part after the apartment code
        const afterApartment = beforeCarrierRef.substring(apartmentMatch[0].length).trim();

        // Remove "Unit" from the beginning if present
        const withoutUnit = afterApartment.replace(/^Unit\s+/i, '');

        // The carrier is the last word(s) before we hit the " - #"
        // Since entity names can have multiple words, we'll look for the last word as carrier
        const words = withoutUnit.trim().split(/\s+/);
        if (words.length < 2) {
          errors.push({
            lineNumber,
            line: trimmedLine,
            reason: 'Could not identify carrier name'
          });
          return;
        }

        // Take the last word as the carrier (USPS, UPS, FEDEX, etc.)
        const carrier = words[words.length - 1];

        // Build the full carrier/tracking field: "CARRIER - #REF - TRACKING..."
        // If the line contains tabs, we should only take up to the next tab
        // (to exclude building number and date which are in separate fields)
        let carrierTrackingPart = fromCarrierRef;
        const tabIndex = carrierTrackingPart.indexOf('\t');
        if (tabIndex !== -1) {
          carrierTrackingPart = carrierTrackingPart.substring(0, tabIndex).trim();
        }
        carrierTrackingField = `${carrier} ${carrierTrackingPart}`;

      } else {
        // Fall back to tab/multi-space separated format
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
            reason: `Insufficient fields - found ${fields.length}, expected at least 3 (apartment, entity, carrier/tracking)`
          });
          return;
        }

        // Field 0: Extract apartment code
        const apartmentMatch = fields[0].match(apartmentRegex);
        if (!apartmentMatch) {
          errors.push({
            lineNumber,
            line: trimmedLine,
            reason: `No valid apartment code found in "${fields[0]}" (expected format: C##L, N##L, etc. - any letter + 2 digits + letter)`
          });
          return;
        }
        apartment = apartmentMatch[1].toUpperCase();
        carrierTrackingField = fields[2];
      }

      // Parse carrier/tracking field
      // Format: "CARRIER - #REFNUM - TRACKINGNUM RECIPIENT NAME"
      const parts = carrierTrackingField.split(' - ');

      if (parts.length < 3) {
        errors.push({
          lineNumber,
          line: trimmedLine,
          reason: `Invalid carrier/tracking format in "${carrierTrackingField}" - expected "CARRIER - #REF - TRACKING RECIPIENT" (found ${parts.length} parts, need 3)`
        });
        return;
      }

      const carrier = parts[0].trim();
      // Part 1 is the internal reference number (ignore)
      const trackingAndRecipient = parts[2].trim();

      // Check for "NO TRACKING" variants
      const noTrackingPatterns = /^(NO\s+TRACKING|NO\s+TRK|NO\s+TRACKING\s+NUMBER)/i;
      let fullTracking: string;
      let recipient: string;
      let trackingLast4: string;

      if (noTrackingPatterns.test(trackingAndRecipient)) {
        // Handle "NO TRACKING NUMBER -- Recipient Name" or similar
        // Match: "NO TRACKING/TRK [NUMBER]" followed by optional dashes/spaces and recipient
        const noTrackMatch = trackingAndRecipient.match(/^(NO\s+(?:TRACKING|TRK)(?:\s+NUMBER)?)\s+[-\s]*(.+)/i);
        if (noTrackMatch && noTrackMatch[2].trim()) {
          fullTracking = noTrackMatch[1].trim();
          recipient = noTrackMatch[2].trim();
          trackingLast4 = 'NONE';
        } else {
          // Just "NO TRACKING" with no recipient after
          fullTracking = trackingAndRecipient.trim();
          recipient = 'UNKNOWN';
          trackingLast4 = 'NONE';
        }
      } else {
        // Normal tracking: first token is tracking, rest is recipient name
        const tokens = trackingAndRecipient.split(/\s+/);
        if (tokens.length < 2) {
          errors.push({
            lineNumber,
            line: trimmedLine,
            reason: 'Could not separate tracking number from recipient name'
          });
          return;
        }

        fullTracking = tokens[0];
        recipient = tokens.slice(1).join(' ');

        // Extract last 4 characters of tracking
        if (fullTracking.length < 4) {
          errors.push({
            lineNumber,
            line: trimmedLine,
            reason: 'Tracking number too short (need at least 4 characters)'
          });
          return;
        }
        trackingLast4 = fullTracking.slice(-4);
      }

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
