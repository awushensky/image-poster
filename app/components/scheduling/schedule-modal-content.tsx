import React, { useState } from 'react';
import { type ProposedPostingSchedule } from "~/model/posting-schedules";
import { type PostingSchedule } from "~/model/posting-schedules";
import ScheduleEditor from './schedule-editor';

interface SettingsModalContentProps {
  initialTimezone: string;
  initialSchedules: PostingSchedule[];
  onSaved: (schedule: ProposedPostingSchedule[], timezone: string) => void;
  onCancel: () => void;
}

export default function ScheduleModalContent({
  initialTimezone,
  initialSchedules,
  onSaved,
  onCancel
}: SettingsModalContentProps) {
  const [schedules, setSchedules] = useState<ProposedPostingSchedule[]>(initialSchedules);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onSaved(schedules, timezone);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleUpdateSchedule = (index: number, update: Partial<ProposedPostingSchedule>) => {
    setSchedules((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...update };
      return updated;
    });
  }

  const hasChanges = JSON.stringify(schedules) !== JSON.stringify(initialSchedules) || timezone !== initialTimezone;

  return (
    <div className="space-y-6">
      <div>
        <ScheduleEditor
          timezone={timezone}
          schedules={schedules}
          onAddSchedule={(scheduleToAdd) => {
            setSchedules((prev) => [...prev, scheduleToAdd]);
          }}
          onToggleSchedule={(index, active) => {
            handleUpdateSchedule(index, { active });
          }}
          onDeleteSchedule={(index) => {
            setSchedules((prev) => prev.filter((_, i) => i !== index));
          }}
          onColorChange={(index, color) => {
            handleUpdateSchedule(index, { color });
          }}
          onTimezoneChange={setTimezone}
        />
      </div>

      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
