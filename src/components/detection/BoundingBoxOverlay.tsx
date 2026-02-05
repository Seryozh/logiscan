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

      // Draw filled rectangle
      ctx.fillStyle = colors.bg;
      ctx.fillRect(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);

      // Draw border
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.strokeRect(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);

      // Draw label with apartment and tracking
      const label = `${detection.parsedApartment || '?'} · ${detection.parsedLast4 || '?'}`;
      const fontSize = Math.max(12, canvas.width / 80);
      ctx.font = `bold ${fontSize}px system-ui`;

      // Measure text for background
      const textMetrics = ctx.measureText(label);
      const padding = 4;
      const labelWidth = textMetrics.width + padding * 2;
      const labelHeight = fontSize + padding * 2;

      // Draw label background
      ctx.fillStyle = colors.border;
      ctx.fillRect(
        pixelBox.x,
        pixelBox.y - labelHeight,
        labelWidth,
        labelHeight
      );

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.fillText(
        label,
        pixelBox.x + padding,
        pixelBox.y - padding - 2
      );

      // Draw confidence indicator
      if (detection.confidence < 0.9) {
        const confText = `${Math.round(detection.confidence * 100)}%`;
        ctx.font = `${fontSize * 0.8}px system-ui`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(
          confText,
          pixelBox.x + pixelBox.width - ctx.measureText(confText).width - padding,
          pixelBox.y + pixelBox.height - padding
        );
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
