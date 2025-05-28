import React, { useState, useEffect } from 'react';
import PostingTimesSelector, { type PostingTime } from './posting-time-selector';

interface SettingsModalContentProps {
  initialPostingTimes: PostingTime[];
  onSave: (times: PostingTime[]) => Promise<void>;
  onCancel: () => void;
}

// Simple preview component for the modal
function SchedulePreview({ times }: { times: PostingTime[] }) {
  const formatTime = (time: PostingTime) => {
    const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
    const ampm = time.hour < 12 ? 'AM' : 'PM';
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour12}:${minute} ${ampm}`;
  };

  const formatTimeWithDays = (time: PostingTime) => {
    const timeStr = formatTime(time);
    if (!time.days || time.days.length === 0 || time.days.length === 7) {
      return `${timeStr} (Daily)`;
    }
    
    const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdays = [1, 2, 3, 4, 5];
    const weekends = [0, 6];
    
    if (time.days.length === 5 && weekdays.every(d => time.days!.includes(d))) {
      return `${timeStr} (Weekdays)`;
    }
    if (time.days.length === 2 && weekends.every(d => time.days!.includes(d))) {
      return `${timeStr} (Weekends)`;
    }
    
    const dayNames = time.days.map(d => DAYS_OF_WEEK[d]).join(', ');
    return `${timeStr} (${dayNames})`;
  };

  if (times.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-500">No posting times configured</p>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="space-y-2">
        <p className="text-sm text-green-700 font-medium">
          {times.length} posting time{times.length !== 1 ? 's' : ''} per day
        </p>
        <div className="space-y-1">
          {times.map((time, index) => (
            <div key={index} className="text-sm text-green-700">
              {formatTimeWithDays(time)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsModalContent({
  initialPostingTimes,
  onSave,
  onCancel
}: SettingsModalContentProps) {
  const [postingTimes, setPostingTimes] = useState<PostingTime[]>(initialPostingTimes);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(postingTimes);
    } catch (error) {
      console.error('Failed to save settings:', error);
      // TODO: Show error message to user
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const hasChanges = JSON.stringify(postingTimes) !== JSON.stringify(initialPostingTimes);
    
    if (hasChanges) {
      const confirmClose = confirm('You have unsaved changes. Are you sure you want to close without saving?');
      if (!confirmClose) {
        return;
      }
    }
    
    // Reset to initial state
    setPostingTimes(initialPostingTimes);
    onCancel();
  };

  const hasChanges = JSON.stringify(postingTimes) !== JSON.stringify(initialPostingTimes);

  // Handle escape key and browser back button
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    if (hasChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  return (
    <div className="space-y-6">
      {/* Preview Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Current Schedule Preview</h3>
        <SchedulePreview times={postingTimes} />
      </div>

      {/* Settings Content */}
      <div>
        <PostingTimesSelector
          initialTimes={postingTimes}
          onChange={setPostingTimes}
        />
      </div>

      {/* Action Buttons */}
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
