import { useEffect, useRef, useState } from 'react';
import type { Detection, PixelBoundingBox } from '../../types/models';

interface BoundingBoxOverlayProps {
  imageUrl: string;
  detections: Detection[];
  onBoxClick?: (detection: Detection) => void;
  selectedDetectionId?: string | null;
}

// Color mapping for detection statuses
const STATUS_COLORS = {
  matched: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e' },      // Green
  duplicate: { bg: 'rgba(234, 179, 8, 0.2)', border: '#eab308' },    // Yellow
  orphan: { bg: 'rgba(249, 115, 22, 0.2)', border: '#f97316' },      // Orange
  unreadable: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444' },   // Red
  ambiguous: { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7' },   // Purple
};

/**
 * Converts percentage-based bounding box to pixel coordinates
 */
function convertBBoxToPixels(
  bbox: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): PixelBoundingBox {
  // Calculate scale factors
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;

  return {
    x: (bbox.x / 100) * imageWidth * scaleX,
    y: (bbox.y / 100) * imageHeight * scaleY,
    width: (bbox.width / 100) * imageWidth * scaleX,
    height: (bbox.height / 100) * imageHeight * scaleY,
  };
}

export default function BoundingBoxOverlay({
  imageUrl,
  detections,
  onBoxClick,
  selectedDetectionId,
}: BoundingBoxOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Load image and get dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      imageRef.current = img;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw image and bounding boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img || imageDimensions.width === 0) {
      return;
    }

    // Set canvas size
    const containerWidth = canvas.parentElement?.clientWidth || 800;
    const aspectRatio = imageDimensions.height / imageDimensions.width;
    canvas.width = containerWidth;
    canvas.height = containerWidth * aspectRatio;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    detections.forEach((detection) => {
      const colors = STATUS_COLORS[detection.status];
      const isSelected = detection.id === selectedDetectionId;

      // Convert percentage bbox to pixels
      const pixelBox = convertBBoxToPixels(
        detection.boundingBox,
        imageDimensions.width,
        imageDimensions.height,
        canvas.width,
        canvas.height
      );

      // Draw semi-transparent fill
      ctx.fillStyle = colors.bg;
      ctx.fillRect(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);

      // Draw border
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.strokeRect(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);

      // Draw small corner label (compact, less obtrusive)
      if (detection.parsedApartment || detection.parsedLast4) {
        const fontSize = Math.max(10, canvas.width / 100);
        ctx.font = `600 ${fontSize}px system-ui`;

        // Create minimal label
        const apt = detection.parsedApartment || '?';
        const track = detection.parsedLast4 || '?';

        // Measure text
        const padding = 3;
        const spacing = 2;
        const aptWidth = ctx.measureText(apt).width;
        const trackWidth = ctx.measureText(track).width;
        const labelWidth = aptWidth + spacing + trackWidth + padding * 2;
        const labelHeight = fontSize + padding * 2;

        // Position label in top-left corner of box with slight offset
        const labelX = pixelBox.x + 2;
        const labelY = pixelBox.y + 2;

        // Draw compact label background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

        // Draw apartment code (brighter)
        ctx.fillStyle = colors.border;
        ctx.fillText(apt, labelX + padding, labelY + fontSize + 1);

        // Draw tracking (white)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(track, labelX + padding + aptWidth + spacing, labelY + fontSize + 1);

        // Draw low confidence indicator (tiny badge in top-right)
        if (detection.confidence < 0.9) {
          const badgeSize = fontSize * 1.2;
          const badgeX = pixelBox.x + pixelBox.width - badgeSize - 2;
          const badgeY = pixelBox.y + 2;

          // Warning badge
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)'; // Red
          ctx.beginPath();
          ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
          ctx.fill();

          // Exclamation mark
          ctx.fillStyle = 'white';
          ctx.font = `bold ${fontSize * 0.9}px system-ui`;
          ctx.textAlign = 'center';
          ctx.fillText('!', badgeX + badgeSize / 2, badgeY + badgeSize / 2 + fontSize * 0.35);
          ctx.textAlign = 'left'; // Reset
        }
      }

      // Draw selection indicator (number badge for easy reference)
      if (isSelected) {
        const badgeSize = Math.max(18, canvas.width / 60);
        const badgeX = pixelBox.x - badgeSize / 2;
        const badgeY = pixelBox.y - badgeSize / 2;

        // Blue circle
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // White border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [imageUrl, detections, imageDimensions, selectedDetectionId]);

  // Handle click on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onBoxClick || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is inside any bounding box
    for (const detection of detections) {
      const pixelBox = convertBBoxToPixels(
        detection.boundingBox,
        imageDimensions.width,
        imageDimensions.height,
        canvas.width,
        canvas.height
      );

      if (
        x >= pixelBox.x &&
        x <= pixelBox.x + pixelBox.width &&
        y >= pixelBox.y &&
        y <= pixelBox.y + pixelBox.height
      ) {
        onBoxClick(detection);
        return;
      }
    }
  };

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-auto cursor-pointer rounded-lg"
      />
    </div>
  );
}
