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
 * Convert a FileUpload or stream to buffer
 */
async function streamToBuffer(input: FileUpload | Readable): Promise<Buffer> {
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
async function compressImage(
  inputBuffer: Buffer,
  maxSizeKB: number,
  maxWidth: number,
  maxHeight: number,
  initialQuality: number = 85
): Promise<Buffer> {
  let quality = initialQuality;
  let result: { buffer: Buffer; width: number; height: number; size: number };
  
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
    quality -= 10;
    
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
 * Create a thumbnail from an image buffer
 */
async function createThumbnail(
  inputBuffer: Buffer,
  size: number = 300
): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Compress and resize an image to fit within specified constraints
 */
export async function compressAndResizeImage(
  input: Buffer | FileUpload | Readable,
  options: Partial<CompressionOptions> = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const inputBuffer = input instanceof Buffer ? input : await streamToBuffer(input as FileUpload | Readable);
  return compressImage(
    inputBuffer,
    opts.maxSizeKB,
    opts.maxWidth,
    opts.maxHeight,
    opts.quality
  );
}

/**
 * Create a thumbnail from an image
 */
export async function generateThumbnail(
  input: Buffer | FileUpload | Readable,
  size: number = 300
): Promise<Buffer> {
  const inputBuffer = input instanceof Buffer ? input : await streamToBuffer(input as FileUpload | Readable);
  return createThumbnail(inputBuffer, size);
}

/**
 * Convert a buffer to a file
 */
export function bufferToFile(image: Buffer, fileName: string) {
  return new File(
    [image.buffer], 
    `compressed-${fileName}`, 
    { type: 'image/jpeg' }
  );
}

/**
 * Get image metadata without processing
 */
export async function getImageMetadata(input: Buffer | FileUpload | Readable) {
  const inputBuffer = input instanceof Buffer ? input : await streamToBuffer(input as FileUpload | Readable);
  const metadata = await sharp(inputBuffer).metadata();
  
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format,
    size: inputBuffer.length,
    sizeKB: Math.round(inputBuffer.length / 1024 * 100) / 100
  };
}
