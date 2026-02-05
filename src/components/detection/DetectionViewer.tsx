import { useState } from 'react';
import { useSession } from '../../stores/sessionStore';
import BoundingBoxOverlay from './BoundingBoxOverlay';
import DetectionDetailCard from './DetectionDetailCard';
import type { Detection } from '../../types/models';

interface DetectionViewerProps {
  photoId: string;
}

export default function DetectionViewer({ photoId }: DetectionViewerProps) {
  const { state } = useSession();
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);

  const photo = state.photos.find(p => p.id === photoId);

  if (!photo) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-sm">Photo not found</p>
      </div>
    );
  }

  const detections = photo.detections;

  return (
    <div className="space-y-4">
      {/* Image with Bounding Boxes */}
      <div className="bg-black rounded-lg overflow-hidden">
        {detections.length > 0 ? (
          <BoundingBoxOverlay
            imageUrl={photo.dataUrl}
            detections={detections}
            onBoxClick={setSelectedDetection}
            selectedDetectionId={selectedDetection?.id}
          />
        ) : (
          <img
            src={photo.dataUrl}
            alt="Captured photo"
            className="w-full h-auto"
          />
        )}
      </div>

      {/* Detection Summary */}
      <div className="grid grid-cols-5 gap-2 text-xs">
        <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5 text-center">
          <div className="font-semibold text-green-900">
            {detections.filter(d => d.status === 'matched').length}
          </div>
          <div className="text-green-600">Matched</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5 text-center">
          <div className="font-semibold text-yellow-900">
            {detections.filter(d => d.status === 'duplicate').length}
          </div>
          <div className="text-yellow-600">Duplicate</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1.5 text-center">
          <div className="font-semibold text-orange-900">
            {detections.filter(d => d.status === 'orphan').length}
          </div>
          <div className="text-orange-600">Orphan</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded px-2 py-1.5 text-center">
          <div className="font-semibold text-red-900">
            {detections.filter(d => d.status === 'unreadable').length}
          </div>
          <div className="text-red-600">Unreadable</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded px-2 py-1.5 text-center">
          <div className="font-semibold text-purple-900">
            {detections.filter(d => d.status === 'ambiguous').length}
          </div>
          <div className="text-purple-600">Ambiguous</div>
        </div>
      </div>

      {/* Detection Detail Card */}
      {selectedDetection && (
        <DetectionDetailCard
          detection={selectedDetection}
          onClose={() => setSelectedDetection(null)}
        />
      )}

      {/* Instructions */}
      {detections.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          Click on any colored box to view detection details
        </div>
      )}
    </div>
  );
}
