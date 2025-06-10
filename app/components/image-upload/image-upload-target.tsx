import React, { useRef, useState } from "react";

interface ImageUploadProps {
  acceptedTypes?: string;
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
}

export default function ImageUploadTarget({
  acceptedTypes = "image/*",
  onFilesSelected,
  disabled = false,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragActive(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  }

  function handleClick() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  }

  return (
    <div
      className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded p-8 transition-colors ${
        disabled 
          ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
          : dragActive 
          ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 cursor-pointer" 
          : "border-gray-300 dark:border-gray-600 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
      }`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <span className={`text-center ${disabled ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-400"}`}>
        {disabled 
          ? "Uploading..."
          : dragActive
          ? "Drop your images here…"
          : "Drag & drop images here, or click to select"}
      </span>
    </div>
  );
}
