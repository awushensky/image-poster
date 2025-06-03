import React, { useState } from 'react';
import { type CronSchedule, type ProposedCronSchedule, type User } from '~/model/model';
import ScheduleEditor from './schedule-editor';

interface SettingsModalContentProps {
  user: User,
  initialSchedules: CronSchedule[];
  onSaved: (schedule: ProposedCronSchedule[], timezone: string) => void;
  onCancel: () => void;
}

export default function ScheduleModalContent({
  user,
  initialSchedules,
  onSaved,
  onCancel
}: SettingsModalContentProps) {
  const [schedules, setSchedules] = useState<ProposedCronSchedule[]>(initialSchedules);
  const [timezone, setTimezone] = useState(user.timezone);
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

  const hasChanges = JSON.stringify(schedules) !== JSON.stringify(initialSchedules);
  console.log('hasChanges:', hasChanges, 'initialSchedules:', initialSchedules, 'schedules:', schedules);

  return (
    <div className="space-y-6">
      <div>
        <ScheduleEditor
          user={user}
          schedules={schedules}
          onAddSchedule={(scheduleToAdd) => {
            setSchedules((prev) => [...prev, scheduleToAdd]);
          }}
          onToggleSchedule={(index, active) => {
            setSchedules((prev) => {
              const updated = [...prev];
              updated[index] = { ...updated[index], active };
              return updated;
            });
          }}
          onDeleteSchedule={(index) => {
            setSchedules((prev) => prev.filter((_, i) => i !== index));
          }}
          onTimezoneChange={(newTimezone) => {
            setTimezone(newTimezone);
          }}
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
