import { CheckCircle } from 'lucide-react';
import type { Package } from '../../types/models';

interface PackageCardProps {
  package: Package;
}

export default function PackageCard({ package: pkg }: PackageCardProps) {
  const getStatusStyles = () => {
    switch (pkg.status) {
      case 'pending':
        return 'bg-white';
      case 'found':
        return 'bg-gray-50 line-through text-gray-500';
      case 'verified':
        return 'bg-green-50 line-through text-gray-500';
      case 'not_found':
        return 'bg-yellow-50';
      default:
        return 'bg-white';
    }
  };

  const getStatusBadge = () => {
    switch (pkg.status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
            Pending
          </span>
        );
      case 'found':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
            Found
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </span>
        );
      case 'not_found':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
            Not Found
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 hover:bg-gray-50 transition-colors ${getStatusStyles()}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Apartment and Tracking */}
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono font-bold text-sm text-gray-900">{pkg.apartment}</span>
            <span className="font-mono text-sm text-gray-600">
              ···{pkg.trackingLast4}
            </span>
            <span className="text-xs text-gray-500 uppercase">{pkg.carrier}</span>
          </div>

          {/* Recipient */}
          <div className="text-sm text-gray-600 truncate" title={pkg.recipient}>
            {pkg.recipient}
          </div>

          {/* Full Tracking (collapsed) */}
          {pkg.status !== 'pending' && (
            <div className="text-xs text-gray-400 font-mono mt-1 truncate" title={pkg.fullTracking}>
              {pkg.fullTracking}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          {getStatusBadge()}
        </div>
      </div>
    </div>
  );
}
