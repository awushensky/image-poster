import React, { useState } from "react";
import Modal from "~/components/modal";
import ImageUploadTarget from "./image-upload-target";
import { uploadImage } from "~/api-interface/image";


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

  async function uploadSingleFile(file: File, index: number): Promise<void> {
    setUploads(prev => prev.map((upload, i) => 
      i === index ? { ...upload, status: 'uploading' } : upload
    ));

    try {
      await uploadImage(file);
      setUploads(prev => prev.map((upload, i) => 
        i === index 
          ? { ...upload, progress: 100, status: 'completed' }
          : upload
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failure';
      setUploads(prev => prev.map((upload, i) => 
        i === index 
          ? { ...upload, status: 'error', error: errorMessage }
          : upload
      ));
    }
  }

  async function processUploads(files: File[]) {
    setIsProcessing(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadSingleFile(files[i], i);
        
        // Small delay between uploads to prevent overwhelming the server
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      setIsProcessing(false);
      onComplete();
    } catch (error) {
      console.error('Upload process failed:', error);
      setIsProcessing(false);
    }
  }

  async function handleFilesSelected(fileList: FileList) {
    const files = Array.from(fileList);
    setHasStarted(true);
    
    const newUploads: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    
    setUploads(newUploads);
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
