import React, { useState, useEffect } from 'react';
import { Save, X, AlertTriangle } from 'lucide-react';
import type { ProposedQueuedImage } from '~/model/model';

interface EditPostModalContentProps {
  initialText: string;
  initialIsNsfw: boolean;
  onSave: (update: Partial<ProposedQueuedImage>) => void;
  onCancel: () => void;
}

const EditPostModalContent: React.FC<EditPostModalContentProps> = ({
  initialText,
  initialIsNsfw,
  onSave,
  onCancel
}) => {
  const [postText, setPostText] = useState(initialText);
  const [isNsfw, setIsNsfw] = useState(initialIsNsfw);

  const handleSave = () => {
    onSave({ postText, isNsfw });
  };

  const handleCancel = () => {
    onCancel();
  };

  const hasChanges = postText !== initialText || Boolean(isNsfw) !== Boolean(initialIsNsfw);

  return (
    <div className="p-6">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Post Text
        </label>
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="Enter your post text..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={6}
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-1">
          Character count: {postText.length}
        </p>
      </div>

      <div className="mb-6">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isNsfw}
            onChange={(e) => setIsNsfw(e.target.checked)}
            className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
          />
          <span className="flex items-center text-sm text-gray-700">
            Mark as NSFW Content
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 text-sm text-white rounded-md transition-colors ${
            hasChanges
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          disabled={!hasChanges}
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default EditPostModalContent;
