import React, { useRef, useState } from "react";
import { Form } from "react-router";

interface ImageUploadProps {
  title?: string;
  acceptedTypes?: string;
}

export default function ImageUpload({
  title = "Upload Image",
  acceptedTypes = "image/*",
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (inputRef.current) {
        inputRef.current.files = e.dataTransfer.files;
      }
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    }
  }

  function handleClick() {
    inputRef.current?.click();
  }

  return (
    <div
      className={`border border-gray-300 p-4 mb-8`}
    >
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <Form
        ref={formRef}
        method="post"
        encType="multipart/form-data"
        className="flex flex-col items-center"
      >
        <div
          className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded p-8 cursor-pointer transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            name="image"
            accept={acceptedTypes}
            required
            className="hidden"
            onChange={() => formRef.current?.requestSubmit()}
          />
          <span className="text-gray-600">
            {dragActive
              ? "Drop your image here…"
              : "Drag & drop an image here, or click to select"}
          </span>
        </div>
      </Form>
    </div>
  );
}
