import sharp from 'sharp';
import { Readable } from 'stream';
import type { FileUpload } from '@mjackson/form-data-parser';


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
 * Convert a FileUpload or stream to buffer
 */
export async function streamToBuffer(input: FileUpload | Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  // Handle FileUpload objects (which have a stream() method)
  if ('stream' in input && typeof input.stream === 'function') {
    const webStream = input.stream();
    const reader = webStream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    
    return Buffer.concat(chunks);
  }
  
  // Handle Node.js Readable streams
  if (input instanceof Readable) {
    return new Promise((resolve, reject) => {
      input.on('data', (chunk) => chunks.push(chunk));
      input.on('error', reject);
      input.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  
  throw new Error('Unsupported input type for stream conversion');
}

/**
 * Compress an image to fit within size constraints while maintaining aspect ratio
 */
export async function compressImage(
  inputBuffer: Buffer,
  options: Partial<CompressionOptions> = {},
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { maxSizeKB, maxWidth, maxHeight, quality } = opts;

  let compressionQuality = quality;
  let result: { buffer: Buffer; width: number; height: number; size: number };

  const originalMetadata = await getImageMetadata(inputBuffer);
  
  // Start with resizing to fit within dimensions
  let sharpInstance = sharp(inputBuffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality });

  result = await processSharpInstance(sharpInstance);
  
  // If still too large, progressively reduce quality
  while (result.size > maxSizeKB * 1024 && quality > 20) {
    compressionQuality -= 10;
    
    sharpInstance = sharp(inputBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality });
    
    result = await processSharpInstance(sharpInstance);
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
        })
        .jpeg({ quality: Math.max(quality, 60) });
      
      result = await processSharpInstance(sharpInstance);
      
      currentMaxWidth = Math.floor(currentMaxWidth * 0.9);
      currentMaxHeight = Math.floor(currentMaxHeight * 0.9);
    }
  }
  
  return result.buffer;
}

/**
 * Create a thumbnail from an image buffer
 */
export async function createThumbnail(
  inputBuffer: Buffer,
  size: number = 150
): Promise<Buffer> {
  return await sharp(inputBuffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'center'
    })
    .toBuffer();
}

/**
 * Convert a buffer to a file
 */
export async function bufferToFile(image: Buffer, fileName: string) {
  const metadata = await getImageMetadata(image);
  return new File([image.buffer], fileName, { type: `image/${metadata.format}` });
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
    sizeKB: Math.round(input.length / 1024 * 100) / 100
  };
}
