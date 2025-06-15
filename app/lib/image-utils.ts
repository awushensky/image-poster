import sharp from 'sharp';
import { Readable } from 'stream';
import type { FileUpload } from '@mjackson/form-data-parser';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 10MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeKB?: number;
  quality?: number;
  thumbnailSize?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 2048,
  maxHeight: 2048,
  maxSizeKB: 950, // Slightly under Bluesky's 976KB limit
  quality: 85,
  thumbnailSize: 300
};

/**
 * Helper function to process sharp instance and return metadata
 */
async function processSharpInstance(sharpInstance: sharp.Sharp): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
}> {
  const buffer = await sharpInstance.toBuffer();
  const metadata = await sharp(buffer).metadata();
  
  return {
    buffer,
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: buffer.length
  };
}

/**
 * Apply format-specific compression settings
 */
function applyFormatCompression(
  sharpInstance: sharp.Sharp, 
  format: string, 
  quality: number
): sharp.Sharp {
  switch (format) {
    case 'jpeg':
    case 'jpg':
      return sharpInstance.jpeg({ quality, mozjpeg: true });
    
    case 'png':
      return sharpInstance.png({ 
        quality,
        compressionLevel: 9,
        palette: quality < 80, // Use palette for lower quality
        colors: quality < 50 ? 64 : undefined
      });
    
    case 'webp':
      return sharpInstance.webp({ 
        quality,
        effort: 6, // Higher effort for better compression
        lossless: false
      });
    
    case 'gif':
      // GIF compression is limited in Sharp, convert to PNG for better compression
      return sharpInstance.png({ 
        quality,
        compressionLevel: 9,
        palette: true,
        colors: 256
      });
    
    default:
      // Fallback to JPEG for unsupported formats
      return sharpInstance.jpeg({ quality, mozjpeg: true });
  }
}

/**
 * Determine the best fallback format for compression
 */
function getFallbackFormat(originalFormat: string, hasTransparency: boolean): string {
  if (hasTransparency && ['png', 'webp', 'gif'].includes(originalFormat)) {
    return 'png';
  }
  
  if (['jpeg', 'jpg'].includes(originalFormat)) {
    return 'jpeg';
  }
  
  if (originalFormat === 'webp') {
    return 'webp';
  }
  
  return hasTransparency ? 'png' : 'jpeg';
}

async function readStreamToBufffer(stream: ReadableStream, maxSizeBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const reader = stream.getReader();
  let totalSize = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      totalSize += chunk.length;
      if (totalSize > maxSizeBytes) {
        throw new Error(`File too large. Maximum allowed size is ${maxSizeBytes / 1024 / 1024}MB`);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  
  return Buffer.concat(chunks);
}

async function readReadableToBuffer(readable: Readable, maxSizeBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  return new Promise((resolve, reject) => {
    readable.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > maxSizeBytes) {
        throw new Error(`File too large. Maximum allowed size is ${maxSizeBytes / 1024 / 1024}MB`);
      }
      chunks.push(chunk);
    });
    readable.on('error', reject);
    readable.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Convert a FileUpload or stream to buffer
 */
export async function streamToBuffer(input: FileUpload | Readable, maxSizeBytes: number = MAX_FILE_SIZE): Promise<Buffer> {
  if ('stream' in input && typeof input.stream === 'function') {
    return await readStreamToBufffer(input.stream(), maxSizeBytes);
  }
  
  if (input instanceof Readable) {
    return await readReadableToBuffer(input, maxSizeBytes);
  }
  
  throw new Error('Unsupported input type for stream conversion');
}

/**
 * Compress an image to fit within size constraints while maintaining aspect ratio and format
 */
export async function compressImage(
  inputBuffer: Buffer,
  options: Partial<CompressionOptions> = {},
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { maxSizeKB, maxWidth, maxHeight, quality } = opts;

  const originalMetadata = await getImageMetadata(inputBuffer);
  const originalFormat = originalMetadata.format.toString() || 'jpeg';
  const hasTransparency = await checkHasTransparency(inputBuffer);
  
  let compressionQuality = quality;
  let currentFormat = originalFormat;
  let result: { buffer: Buffer; width: number; height: number; size: number };

  // Start with resizing to fit within dimensions using original format
  let sharpInstance = sharp(inputBuffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

  sharpInstance = applyFormatCompression(sharpInstance, currentFormat, compressionQuality);
  result = await processSharpInstance(sharpInstance);
  
  // If still too large, progressively reduce quality
  while (result.size > maxSizeKB * 1024 && compressionQuality > 20) {
    compressionQuality -= 10;
    
    sharpInstance = sharp(inputBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    
    sharpInstance = applyFormatCompression(sharpInstance, currentFormat, compressionQuality);
    result = await processSharpInstance(sharpInstance);
  }
  
  // If still too large, try switching to a more efficient format
  if (result.size > maxSizeKB * 1024) {
    const fallbackFormat = getFallbackFormat(originalFormat, hasTransparency);
    
    if (fallbackFormat !== currentFormat) {
      currentFormat = fallbackFormat;
      compressionQuality = Math.max(quality - 20, 60); // Reset quality but lower
      
      sharpInstance = sharp(inputBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      
      sharpInstance = applyFormatCompression(sharpInstance, currentFormat, compressionQuality);
      result = await processSharpInstance(sharpInstance);
    }
  }
  
  // If still too large, reduce dimensions
  if (result.size > maxSizeKB * 1024) {
    let currentMaxWidth = Math.floor(maxWidth * 0.8);
    let currentMaxHeight = Math.floor(maxHeight * 0.8);
    
    while (result.size > maxSizeKB * 1024 && currentMaxWidth > 200) {
      sharpInstance = sharp(inputBuffer)
        .resize(currentMaxWidth, currentMaxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      
      sharpInstance = applyFormatCompression(sharpInstance, currentFormat, Math.max(compressionQuality, 60));
      result = await processSharpInstance(sharpInstance);
      
      currentMaxWidth = Math.floor(currentMaxWidth * 0.9);
      currentMaxHeight = Math.floor(currentMaxHeight * 0.9);
    }
  }
  
  // Final fallback: if still too large and we haven't tried JPEG, convert to JPEG
  if (result.size > maxSizeKB * 1024 && currentFormat !== 'jpeg') {
    sharpInstance = sharp(inputBuffer)
      .resize(Math.floor(maxWidth * 0.6), Math.floor(maxHeight * 0.6), {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 60, mozjpeg: true });
    
    result = await processSharpInstance(sharpInstance);
  }
  
  return result.buffer;
}

/**
 * Check if an image has transparency
 */
async function checkHasTransparency(inputBuffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(inputBuffer).metadata();
    
    // PNG and WebP can have transparency
    if (metadata.format === 'png' || metadata.format === 'webp') {
      return metadata.hasAlpha || false;
    }
    
    // GIF can have transparency
    if (metadata.format === 'gif') {
      return true; // Assume GIF might have transparency
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Create a thumbnail from an image buffer
 */
export async function createThumbnail(
  inputBuffer: Buffer,
  size: number = 150
): Promise<Buffer> {
  const originalMetadata = await getImageMetadata(inputBuffer);
  const hasTransparency = await checkHasTransparency(inputBuffer);
  
  let sharpInstance = sharp(inputBuffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'center'
    });
  
  if (hasTransparency && ['png', 'webp', 'gif'].includes(originalMetadata.format || '')) {
    sharpInstance = sharpInstance.png({ quality: 80 });
  } else {
    sharpInstance = sharpInstance.jpeg({ quality: 80 });
  }
  
  return await sharpInstance.toBuffer();
}

/**
 * Convert a buffer to a file
 */
export async function bufferToFile(image: Buffer, fileName: string): Promise<File> {
  const metadata = await getImageMetadata(image);
  const mimeType = getMimeType(metadata.format || 'jpeg');
  return new File([image], fileName, { type: mimeType });
}

/**
 * Get MIME type for format
 */
function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif'
  };
  
  return mimeTypes[format] || 'image/jpeg';
}

/**
 * Get image metadata without processing
 */
export async function getImageMetadata(input: Buffer) {
  const metadata = await sharp(input).metadata();
  
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format,
    size: input.length,
    sizeKB: Math.round(input.length / 1024 * 100) / 100,
    hasAlpha: metadata.hasAlpha || false
  };
}
