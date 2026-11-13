/**
 * HALDER Agricultural Client-Side Image Compression Engine
 * Built specifically for rural India 2G/3G/4G network conditions.
 * Compresses 5-15MB high-resolution camera photos down to 80-180KB
 * preserving produce textures and crop quality without freezing the UI.
 */

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  targetMaxBytes?: number;
  lowBandwidthMode?: boolean;
}

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  originalFormatted: string;
  compressedFormatted: string;
  width: number;
  height: number;
  filename: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Compresses a single image file with adaptive aspect ratio downscaling
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const lowBandwidth = options.lowBandwidthMode ?? false;
    const maxDimension = options.maxDimension ?? (lowBandwidth ? 960 : 1200);
    let quality = options.quality ?? (lowBandwidth ? 0.68 : 0.80);
    const originalSize = file.size;

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Downscale while preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const rawResult = readerEvent.target?.result as string;
          return resolve({
            dataUrl: rawResult,
            originalSize,
            compressedSize: originalSize,
            savingsPercent: 0,
            originalFormatted: formatBytes(originalSize),
            compressedFormatted: formatBytes(originalSize),
            width,
            height,
            filename: file.name,
          });
        }

        // Draw crisp JPEG background (white fill for transparent PNGs)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          let approxBytes = Math.round((compressedDataUrl.length * 3) / 4);

          // If still larger than 250KB in low-bandwidth mode, step down quality once
          if (lowBandwidth && approxBytes > 180 * 1024 && quality > 0.50) {
            quality = 0.55;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            approxBytes = Math.round((compressedDataUrl.length * 3) / 4);
          }

          const savingsPercent = originalSize > approxBytes
            ? Math.round(((originalSize - approxBytes) / originalSize) * 100)
            : 0;

          resolve({
            dataUrl: compressedDataUrl,
            originalSize,
            compressedSize: approxBytes,
            savingsPercent,
            originalFormatted: formatBytes(originalSize),
            compressedFormatted: formatBytes(approxBytes),
            width,
            height,
            filename: file.name,
          });
        } catch {
          const rawResult = readerEvent.target?.result as string;
          resolve({
            dataUrl: rawResult,
            originalSize,
            compressedSize: originalSize,
            savingsPercent: 0,
            originalFormatted: formatBytes(originalSize),
            compressedFormatted: formatBytes(originalSize),
            width,
            height,
            filename: file.name,
          });
        }
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Batch multi-image compressor with live per-image progress reporting
 */
export async function compressMultipleImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number, lastResult?: CompressionResult) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    try {
      const res = await compressImageFile(file, options);
      results.push(res);
      if (onProgress) {
        onProgress(i + 1, total, res);
      }
    } catch (err) {
      console.warn(`[ImageCompressor] Failed to compress ${file.name}:`, err);
    }
  }

  return results;
}
