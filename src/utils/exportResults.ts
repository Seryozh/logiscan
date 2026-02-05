import type { Package } from '../types/models';

/**
 * Exports remaining (unmatched) packages as plain text
 */
export function exportRemainingPackages(packages: Package[]): string {
  if (packages.length === 0) {
    return 'No remaining packages to export.';
  }

  const lines: string[] = [];

  // Header
  lines.push('=== REMAINING PACKAGES ===');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Total: ${packages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Group by status
  const pendingPackages = packages.filter(p => p.status === 'pending');
  const notFoundPackages = packages.filter(p => p.status === 'not_found');

  if (pendingPackages.length > 0) {
    lines.push(`PENDING (${pendingPackages.length}):`);
    lines.push('');
    pendingPackages.forEach(pkg => {
      lines.push(`${pkg.apartment} - ${pkg.trackingLast4} - ${pkg.carrier} - ${pkg.recipient}`);
    });
    lines.push('');
  }

  if (notFoundPackages.length > 0) {
    lines.push(`NOT FOUND (${notFoundPackages.length}):`);
    lines.push('');
    notFoundPackages.forEach(pkg => {
      lines.push(`${pkg.apartment} - ${pkg.trackingLast4} - ${pkg.carrier} - ${pkg.recipient}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Exports remaining packages as CSV format
 */
export function exportRemainingPackagesAsCSV(packages: Package[]): string {
  const lines: string[] = [];

  // Header row
  lines.push('Apartment,Tracking Last 4,Carrier,Recipient,Full Tracking,Status');

  // Data rows
  packages.forEach(pkg => {
    const row = [
      pkg.apartment,
      pkg.trackingLast4,
      pkg.carrier,
      `"${pkg.recipient.replace(/"/g, '""')}"`, // Escape quotes in recipient names
      pkg.fullTracking,
      pkg.status
    ].join(',');
    lines.push(row);
  });

  return lines.join('\n');
}

/**
 * Exports full session data as JSON (for backup/debugging)
 */
export function exportSessionAsJSON(sessionState: any): string {
  return JSON.stringify(sessionState, null, 2);
}
