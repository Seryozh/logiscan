import { X, Package, AlertTriangle } from 'lucide-react';
import { useSession } from '../../stores/sessionStore';
import type { Detection } from '../../types/models';

interface DetectionDetailCardProps {
  detection: Detection;
  onClose: () => void;
}

const STATUS_INFO = {
  matched: {
    label: 'Matched',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Package,
    description: 'Successfully matched to a package in your list'
  },
  duplicate: {
    label: 'Duplicate',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    description: 'This sticker was already detected in a previous photo'
  },
  orphan: {
    label: 'Orphan',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
    description: 'Sticker found but not in your imported package list'
  },
  unreadable: {
    label: 'Unreadable',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle,
    description: 'Could not read apartment code or tracking number'
  },
  ambiguous: {
    label: 'Ambiguous',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: AlertTriangle,
    description: 'Multiple packages match this apartment and tracking number'
  },
};

export default function DetectionDetailCard({ detection, onClose }: DetectionDetailCardProps) {
  const { state } = useSession();
  const statusInfo = STATUS_INFO[detection.status];
  const StatusIcon = statusInfo.icon;

  // Find matched package if any
  const matchedPackage = detection.matchedPackageId
    ? state.packages.find(p => p.id === detection.matchedPackageId)
    : null;

  return (
    <div className={`border-2 ${statusInfo.borderColor} rounded-lg ${statusInfo.bgColor} p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
          <div>
            <h3 className={`font-semibold ${statusInfo.color}`}>{statusInfo.label}</h3>
            <p className="text-xs text-gray-600 mt-0.5">{statusInfo.description}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Detection Data */}
      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600 text-xs">Apartment:</span>
            <div className="font-mono font-semibold">
              {detection.parsedApartment || <span className="text-gray-400">Not detected</span>}
            </div>
          </div>
          <div>
            <span className="text-gray-600 text-xs">Last 4:</span>
            <div className="font-mono font-semibold">
              {detection.parsedLast4 || <span className="text-gray-400">Not detected</span>}
            </div>
          </div>
          <div>
            <span className="text-gray-600 text-xs">Date:</span>
            <div className="text-sm">
              {detection.parsedDate || <span className="text-gray-400">-</span>}
            </div>
          </div>
          <div>
            <span className="text-gray-600 text-xs">Initials:</span>
            <div className="text-sm">
              {detection.parsedInitials || <span className="text-gray-400">-</span>}
            </div>
          </div>
        </div>

        {/* Raw Text */}
        <div>
          <span className="text-gray-600 text-xs">Raw Text:</span>
          <div className="text-xs font-mono bg-white border border-gray-200 rounded p-2 mt-1 whitespace-pre-wrap">
            {detection.rawText}
          </div>
        </div>

        {/* Confidence */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600 text-xs">Confidence:</span>
            <span className="text-xs font-semibold">{Math.round(detection.confidence * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                detection.confidence >= 0.9
                  ? 'bg-green-600'
                  : detection.confidence >= 0.7
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
              }`}
              style={{ width: `${detection.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Notes */}
        {detection.notes && (
          <div>
            <span className="text-gray-600 text-xs">Notes:</span>
            <div className="text-xs text-gray-700 mt-1">{detection.notes}</div>
          </div>
        )}
      </div>

      {/* Matched Package Info */}
      {matchedPackage && (
        <div className="border-t border-gray-300 pt-3 mt-3">
          <div className="text-xs text-gray-600 mb-2">Matched Package:</div>
          <div className="bg-white border border-gray-200 rounded p-3 text-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="font-mono font-bold">{matchedPackage.apartment}</span>
              <span className="text-xs text-gray-500 uppercase">{matchedPackage.carrier}</span>
            </div>
            <div className="text-gray-700">{matchedPackage.recipient}</div>
            <div className="text-xs text-gray-500 font-mono mt-1">{matchedPackage.fullTracking}</div>
          </div>
        </div>
      )}
    </div>
  );
}
