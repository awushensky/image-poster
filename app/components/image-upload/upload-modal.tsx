import React, { useState, useCallback } from "react";
import Modal from "~/components/modal";
import ImageUploadTarget from "./image-upload-target";

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadModalProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function UploadModal({ onComplete, onCancel }: UploadModalProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const hasActiveUploads = uploads.some(upload => upload.status === 'uploading');
  const canClose = !hasActiveUploads && !isProcessing;

  const uploadSingleFile = useCallback(async (file: File, index: number): Promise<void> => {
    console.log(`🚀 Starting upload for ${file.name} (${index + 1})`);
    
    // Mark as uploading
    setUploads(prev => prev.map((upload, i) => 
      i === index ? { ...upload, status: 'uploading' } : upload
    ));

    try {
      const formData = new FormData();
      formData.append('image', file);

      console.log(`📡 Making fetch request for ${file.name}...`);
      
      const response = await fetch('/api/image', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type - let browser set it for FormData
        }
      });

      console.log(`📡 Response received for ${file.name}:`, {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        redirected: response.redirected,
        type: response.type,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error(`❌ Non-JSON response for ${file.name}:`, {
          contentType,
          status: response.status,
          body: textResponse.substring(0, 500) + (textResponse.length > 500 ? '...' : '')
        });
        
        setUploads(prev => prev.map((upload, i) => 
          i === index 
            ? { ...upload, status: 'error', error: `Server returned ${contentType || 'unknown'} instead of JSON` }
            : upload
        ));
        return;
      }

      const result = await response.json();
      console.log(`📦 Parsed JSON for ${file.name}:`, result);

      if (result.success) {
        console.log(`✅ Upload completed for ${file.name}`, result);
        
        setUploads(prev => prev.map((upload, i) => 
          i === index 
            ? { ...upload, progress: 100, status: 'completed' }
            : upload
        ));
      } else {
        const errorMessage = result.error || 'Upload failed';
        console.error(`❌ Upload failed for ${file.name}:`, errorMessage);
        
        setUploads(prev => prev.map((upload, i) => 
          i === index 
            ? { ...upload, status: 'error', error: errorMessage }
            : upload
        ));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error(`❌ Upload failed for ${file.name}:`, error);
      
      setUploads(prev => prev.map((upload, i) => 
        i === index 
          ? { ...upload, status: 'error', error: errorMessage }
          : upload
      ));
    }
  }, []);

  const processUploads = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    
    try {
      // Process uploads sequentially with a small delay between each
      for (let i = 0; i < files.length; i++) {
        console.log(`⏳ About to upload file ${i + 1}/${files.length}`);
        await uploadSingleFile(files[i], i);
        console.log(`✅ Finished uploading file ${i + 1}/${files.length}`);
        
        // Small delay between uploads to prevent overwhelming the server
        if (i < files.length - 1) {
          console.log(`⏱️ Waiting 200ms before next upload...`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      setIsProcessing(false);
      console.log('🎉 All uploads processed, calling onComplete');
      onComplete();
    } catch (error) {
      console.error('Upload process failed:', error);
      setIsProcessing(false);
    }
  }, [uploadSingleFile, onComplete]);

  async function handleFilesSelected(fileList: FileList) {
    const files = Array.from(fileList);
    setHasStarted(true);
    
    // Initialize upload progress for all files
    const newUploads: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    
    setUploads(newUploads);
    console.log(`📦 Starting upload of ${files.length} files`);
    
    // Start processing uploads
    processUploads(files);
  }

  const allCompleted = hasStarted && uploads.length > 0 && !isProcessing && uploads.every(u => u.status !== 'uploading' && u.status !== 'pending');
  const hasErrors = uploads.some(u => u.status === 'error');
  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const uploadingCount = uploads.filter(u => u.status === 'uploading').length;
  const pendingCount = uploads.filter(u => u.status === 'pending').length;

  return (
    <Modal
      title="Upload Images"
      onClose={onCancel}
      closeEnabled={canClose}
      size="md"
    >
      {!hasStarted && (
        <div className="mb-6">
          <ImageUploadTarget
            onFilesSelected={handleFilesSelected}
            disabled={hasActiveUploads || isProcessing}
          />
        </div>
      )}

      {uploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-gray-700">
            Upload Progress ({completedCount}/{uploads.length})
          </h3>
          
          {/* Debug info */}
          <div className="text-xs text-gray-500">
            Uploading: {uploadingCount} | 
            Pending: {pendingCount} | 
            Completed: {completedCount} |
            Errors: {uploads.filter(u => u.status === 'error').length}
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-2">
            {uploads.map((upload, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded text-sm">
                <span className="truncate flex-1" title={upload.file.name}>
                  {upload.file.name}
                </span>
                
                {upload.status === 'pending' && (
                  <span className="text-xs text-gray-500">Waiting...</span>
                )}
                
                {upload.status === 'uploading' && (
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-1.5 bg-gray-200 rounded">
                      <div className="h-full bg-blue-500 rounded animate-pulse" />
                    </div>
                    <span className="text-xs text-gray-500">Uploading...</span>
                  </div>
                )}
                
                {upload.status === 'completed' && (
                  <span className="text-xs text-green-600 font-medium">✓ Complete</span>
                )}
                
                {upload.status === 'error' && (
                  <span className="text-xs text-red-600 font-medium" title={upload.error}>
                    ✗ Failed: {upload.error}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {hasErrors && allCompleted && (
            <div className="text-center text-amber-600 text-sm">
              Some uploads failed. You can close this dialog and try again.
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex justify-end space-x-3">
        {!hasStarted && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
        
        {allCompleted && (
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Done
          </button>
        )}
      </div>
    </Modal>
  );
}
