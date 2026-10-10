import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

/**
 * Compress image on client side before uploading
 */
export async function compressImage(file: File, options?: CompressionOptions): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 0.2, // Maximum file size in MB
    // maxSizeKb:"d",
    maxWidthOrHeight: 1920, // Maximum width or height
    useWebWorker: true, // Use web worker for better performance
    quality: 0.85, // Quality between 0 and 1
    ...options,
  };

  // imageCompression takes a File or Blob
  return await imageCompression(file, defaultOptions);
}

/**
 * Resize image to specific dimensions
 */
export async function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', (e) => {
      const img = new Image();
      img.addEventListener('load', () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          file.type,
          0.85
        );
      });

      img.addEventListener('error', () => {
        reject(new Error('Failed to load image'));
      });
      img.src = e.target?.result as string;
    });

    reader.addEventListener('error', () => {
      reject(new Error('Failed to read file'));
    });
    reader.readAsDataURL(file);
  });
}
