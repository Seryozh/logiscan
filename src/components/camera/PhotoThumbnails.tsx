import { Trash2, CheckCircle, Loader } from 'lucide-react';
import { useSession } from '../../stores/sessionStore';

interface PhotoThumbnailsProps {
  selectedPhotoId?: string | null;
  onSelectPhoto?: (photoId: string) => void;
}

export default function PhotoThumbnails({ selectedPhotoId, onSelectPhoto }: PhotoThumbnailsProps) {
  const { state, deletePhoto } = useSession();

  const handleDelete = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this photo? This will also remove all its detections.')) {
      deletePhoto(photoId);
      // If this was the selected photo, clear selection
      if (photoId === selectedPhotoId && onSelectPhoto) {
        onSelectPhoto(null);
      }
    }
  };

  if (state.photos.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No photos captured yet
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Captured Photos ({state.photos.length})
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {state.photos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => onSelectPhoto?.(photo.id)}
            className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
              selectedPhotoId === photo.id
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Thumbnail Image */}
            <img
              src={photo.dataUrl}
              alt={`Photo ${photo.id.slice(0, 8)}`}
              className="w-full h-full object-cover"
            />

            {/* Processing Indicator */}
            {!photo.processed && (
              <div className="absolute inset-0 bg-blue-900/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader className="w-5 h-5 mx-auto animate-spin mb-1" />
                  <p className="text-xs font-medium">Processing...</p>
                </div>
              </div>
            )}

            {/* Processed Indicator */}
            {photo.processed && (
              <div className="absolute top-1 right-1">
                <div className="bg-green-500 rounded-full p-1">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              </div>
            )}

            {/* Detection Count */}
            {photo.detections.length > 0 && (
              <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {photo.detections.length} detected
              </div>
            )}

            {/* Delete Button */}
            <button
              onClick={(e) => handleDelete(photo.id, e)}
              className="absolute top-1 left-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded shadow-lg transition-opacity"
              title="Delete photo"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
