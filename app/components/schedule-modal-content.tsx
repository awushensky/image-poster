import React, { useState } from 'react';
import PostingTimesSelector from './posting-time-selector';
import { type PostingTime } from '~/model/model';
import { useFetcher } from 'react-router';

interface SettingsModalContentProps {
  initialPostingTimes: PostingTime[];
  onSaved: (times: PostingTime[]) => void;
  onCancel: () => void;
}

export default function ScheduleModalContent({
  initialPostingTimes,
  onSaved,
  onCancel
}: SettingsModalContentProps) {
  const [postingTimes, setPostingTimes] = useState<PostingTime[]>(initialPostingTimes);
  const [isSaving, setIsSaving] = useState(false);
  const fetcher = useFetcher();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      fetcher.submit(
        { values: JSON.stringify(postingTimes) },
        { method: "POST", action: "/api/posting-times" }
      );
      onSaved(postingTimes);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPostingTimes(initialPostingTimes);
    onCancel();
  };

  const hasChanges = JSON.stringify(postingTimes) !== JSON.stringify(initialPostingTimes);

  return (
    <div className="space-y-6">
      <div>
        <PostingTimesSelector
          initialTimes={postingTimes}
          onChange={setPostingTimes}
        />
      </div>

      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
