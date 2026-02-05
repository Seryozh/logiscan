/**
 * Compresses an image to reduce file size before sending to AI API
 *
 * @param dataUrl - Base64 data URL of the image
 * @param maxWidth - Maximum width in pixels (maintains aspect ratio)
 * @param quality - JPEG quality 0-1 (0.85 recommended)
 * @returns Promise resolving to compressed image data URL
 */
export async function compressImage(
  dataUrl: string,
  maxWidth: number = 1920,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate dimensions (maintain aspect ratio)
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with quality setting
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      // Check if result is under 4MB (API limit)
      const sizeInBytes = Math.round((compressedDataUrl.length * 3) / 4);
      const sizeInMB = sizeInBytes / (1024 * 1024);

      if (sizeInMB > 4) {
        console.warn(`Compressed image is ${sizeInMB.toFixed(2)}MB, may exceed API limits`);
      }

      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}

/**
 * Estimates the file size of a base64 data URL in bytes
 */
export function estimateDataUrlSize(dataUrl: string): number {
  // Base64 encoding adds ~33% overhead, so actual size is ~75% of string length
  return Math.round((dataUrl.length * 3) / 4);
}

/**
 * Formats bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
