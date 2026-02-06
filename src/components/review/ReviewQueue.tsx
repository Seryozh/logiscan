import { useState } from 'react';
import { AlertCircle, CheckCircle, X, Edit3, Eye } from 'lucide-react';
import { useSession } from '../../stores/sessionStore';
import ReviewCard from './ReviewCard';
import type { Detection } from '../../types/models';

export default function ReviewQueue() {
  const { state } = useSession();
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const [filter, setFilter] = useState<'all' | 'low-confidence' | 'orphan' | 'ambiguous' | 'unreadable'>('all');

  // Get detections that need review
  const flaggedDetections = state.detections.filter((det) => {
    // Low confidence
    if (det.confidence < 0.9) return true;
    // Orphans (not matched)
    if (det.status === 'orphan') return true;
    // Ambiguous
    if (det.status === 'ambiguous') return true;
    // Unreadable
    if (det.status === 'unreadable') return true;
    return false;
  });

  // Apply filter
  const filteredDetections = flaggedDetections.filter((det) => {
    if (filter === 'all') return true;
    if (filter === 'low-confidence') return det.confidence < 0.9;
    if (filter === 'orphan') return det.status === 'orphan';
    if (filter === 'ambiguous') return det.status === 'ambiguous';
    if (filter === 'unreadable') return det.status === 'unreadable';
    return false;
  });

  // Sort by confidence (lowest first)
  const sortedDetections = [...filteredDetections].sort((a, b) => a.confidence - b.confidence);

  if (flaggedDetections.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Review Queue</h2>
        </div>
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">All detections look good!</p>
          <p className="text-sm text-gray-500 mt-1">No items need manual review</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Review Queue</h2>
            <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
              {flaggedDetections.length}
            </span>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({flaggedDetections.length})
          </button>
          <button
            onClick={() => setFilter('low-confidence')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === 'low-confidence'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Low Confidence ({flaggedDetections.filter(d => d.confidence < 0.9).length})
          </button>
          <button
            onClick={() => setFilter('orphan')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === 'orphan'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Orphans ({flaggedDetections.filter(d => d.status === 'orphan').length})
          </button>
          <button
            onClick={() => setFilter('ambiguous')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === 'ambiguous'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ambiguous ({flaggedDetections.filter(d => d.status === 'ambiguous').length})
          </button>
          <button
            onClick={() => setFilter('unreadable')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === 'unreadable'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unreadable ({flaggedDetections.filter(d => d.status === 'unreadable').length})
          </button>
        </div>
      </div>

      {/* Detection list */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {sortedDetections.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No detections in this category
          </div>
        ) : (
          sortedDetections.map((detection) => (
            <div
              key={detection.id}
              className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedDetection?.id === detection.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => setSelectedDetection(detection)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {detection.parsedApartment || '???'}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="font-mono text-sm text-gray-700">
                      {detection.parsedLast4 || '????'}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        detection.status === 'orphan'
                          ? 'bg-orange-100 text-orange-700'
                          : detection.status === 'ambiguous'
                          ? 'bg-purple-100 text-purple-700'
                          : detection.status === 'unreadable'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {detection.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{detection.rawText}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div
                      className={`text-xs font-semibold ${
                        detection.confidence < 0.7
                          ? 'text-red-600'
                          : detection.confidence < 0.9
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {Math.round(detection.confidence * 100)}%
                    </div>
                  </div>
                  {selectedDetection?.id === detection.id ? (
                    <Edit3 className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review card modal */}
      {selectedDetection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Review Detection</h3>
              <button
                onClick={() => setSelectedDetection(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ReviewCard
              detection={selectedDetection}
              photo={state.photos.find((p) => p.id === selectedDetection.photoId)!}
              onClose={() => setSelectedDetection(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
