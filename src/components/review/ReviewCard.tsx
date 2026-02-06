import { useState } from 'react';
import { Save, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { useSession } from '../../stores/sessionStore';
import { matchDetections } from '../../utils/matchingAlgorithm';
import type { Detection, Photo } from '../../types/models';

interface ReviewCardProps {
  detection: Detection;
  photo: Photo;
  onClose: () => void;
}

export default function ReviewCard({ detection, photo, onClose }: ReviewCardProps) {
  const { state, updateDetection, updatePackagesAndDetections } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [apartment, setApartment] = useState(detection.parsedApartment || '');
  const [tracking, setTracking] = useState(detection.parsedLast4 || '');
  const [notes, setNotes] = useState(detection.notes || '');

  // Find matched package if any
  const matchedPackage = detection.matchedPackageId
    ? state.packages.find((p) => p.id === detection.matchedPackageId)
    : null;

  const handleSave = () => {
    // Update detection with corrected values
    const updatedDetection: Detection = {
      ...detection,
      parsedApartment: apartment.trim() || null,
      parsedLast4: tracking.trim() || null,
      notes: notes.trim() || detection.notes,
      confidence: 1.0, // Manual correction = 100% confidence
    };

    updateDetection(updatedDetection);

    // Re-run matching algorithm
    const allDetections = state.detections.map((d) =>
      d.id === detection.id ? updatedDetection : d
    );
    const matchResult = matchDetections(state.packages, allDetections);
    updatePackagesAndDetections(matchResult.updatedPackages, matchResult.updatedDetections);

    setIsEditing(false);
    onClose();
  };

  const handleMarkAsError = () => {
    // Mark as unreadable and add note
    const updatedDetection: Detection = {
      ...detection,
      status: 'unreadable',
      notes: (detection.notes || '') + ' [Marked as error by user]',
    };
    updateDetection(updatedDetection);
    onClose();
  };

  const handleConfirmCorrect = () => {
    // Boost confidence to 1.0 if user confirms it's correct
    const updatedDetection: Detection = {
      ...detection,
      confidence: 1.0,
      notes: (detection.notes || '') + ' [Verified by user]',
    };
    updateDetection(updatedDetection);
    onClose();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Cropped sticker image */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Sticker Preview</h4>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <img
            src={photo.dataUrl}
            alt="Sticker preview"
            className="absolute inset-0 w-full h-full object-contain rounded border border-gray-300"
          />
        </div>
      </div>

      {/* Detection info */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Detected Information</h4>

        {isEditing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apartment Code
              </label>
              <input
                type="text"
                value={apartment}
                onChange={(e) => setApartment(e.target.value.toUpperCase())}
                placeholder="C12A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Last 4
              </label>
              <input
                type="text"
                value={tracking}
                onChange={(e) => setTracking(e.target.value.toUpperCase())}
                placeholder="1234"
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this detection..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-500">Apartment</span>
                <p className="font-mono font-semibold text-gray-900">
                  {detection.parsedApartment || 'Not detected'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Tracking Last 4</span>
                <p className="font-mono font-semibold text-gray-900">
                  {detection.parsedLast4 || 'Not detected'}
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-500">Raw Text</span>
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 font-mono whitespace-pre-wrap">
                {detection.rawText || 'No text extracted'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-500">Confidence</span>
                <p
                  className={`font-semibold ${
                    detection.confidence < 0.7
                      ? 'text-red-600'
                      : detection.confidence < 0.9
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}
                >
                  {Math.round(detection.confidence * 100)}%
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Status</span>
                <p className="font-semibold capitalize">{detection.status}</p>
              </div>
            </div>

            {detection.notes && (
              <div>
                <span className="text-xs text-gray-500">Notes</span>
                <p className="text-sm text-gray-700">{detection.notes}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Matched package */}
      {matchedPackage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Package className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-green-900">Matched Package</p>
              <p className="text-sm text-green-800 mt-1">
                <span className="font-mono">{matchedPackage.apartment}</span> ·{' '}
                {matchedPackage.carrier} · <span className="font-mono">{matchedPackage.trackingLast4}</span>
              </p>
              {matchedPackage.recipient && (
                <p className="text-xs text-green-700 mt-1">{matchedPackage.recipient}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleConfirmCorrect}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm Correct
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Save className="w-4 h-4" />
              Edit Values
            </button>
            <button
              onClick={handleMarkAsError}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              <AlertTriangle className="w-4 h-4" />
              Mark as Error
            </button>
          </>
        )}
      </div>
    </div>
  );
}
