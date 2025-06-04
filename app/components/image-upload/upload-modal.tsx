import React, { useState } from "react";
import Modal from "~/components/modal";
import ImageUploadTarget from "./image-upload-target";


interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadModalProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function UploadModal({ onComplete, onCancel }: UploadModalProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [hasStarted, setHasStarted] = useState(false);

  const hasActiveUploads = uploads.some(upload => upload.status === 'uploading');
  const canClose = !hasActiveUploads;

  async function handleFilesSelected(fileList: FileList) {
    const files = Array.from(fileList);
    setHasStarted(true);
    
    // Initialize upload progress for all files
    const newUploads: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }));
    
    setUploads(newUploads);

    // Upload files in parallel
    const uploadPromises = files.map((file, index) => 
      uploadSingleFile(file, index)
    );

    try {
      await Promise.allSettled(uploadPromises);
      onComplete();
    } catch (error) {
      console.error('Some uploads failed:', error);
    }
  }

  async function uploadSingleFile(file: File, uploadIndex: number) {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Update progress to completed
      setUploads(prev => prev.map((upload, i) => 
        i === uploadIndex 
          ? { ...upload, progress: 100, status: 'completed' }
          : upload
      ));

    } catch (error) {
      // Update progress to error
      setUploads(prev => prev.map((upload, i) => 
        i === uploadIndex 
          ? { 
              ...upload, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : upload
      ));
    }
  }

  const allCompleted = hasStarted && uploads.length > 0 && uploads.every(u => u.status !== 'uploading');
  const hasErrors = uploads.some(u => u.status === 'error');

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
            disabled={hasActiveUploads}
          />
        </div>
      )}

      {uploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-gray-700">
            Upload Progress ({uploads.filter(u => u.status === 'completed').length}/{uploads.length})
          </h3>
          
          <div className="max-h-40 overflow-y-auto space-y-2">
            {uploads.map((upload, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded text-sm">
                <span className="truncate flex-1" title={upload.file.name}>
                  {upload.file.name}
                </span>
                
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
                    ✗ Failed
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
