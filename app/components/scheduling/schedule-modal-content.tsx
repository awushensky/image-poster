import React, { useEffect, useState } from 'react';
import { type ProposedPostingSchedule } from "~/model/posting-schedules";
import { type PostingSchedule } from "~/model/posting-schedules";
import ScheduleEditor from './schedule-editor';

interface SettingsModalContentProps {
  initialTimezone: string;
  initialSchedules: PostingSchedule[];
  onSaved: (schedule: ProposedPostingSchedule[], timezone: string) => void;
}

export default function ScheduleModalContent({
  initialTimezone,
  initialSchedules,
  onSaved,
}: SettingsModalContentProps) {
  const [schedules, setSchedules] = useState<ProposedPostingSchedule[]>(initialSchedules);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [isSaving, setIsSaving] = useState(false);

  // Save schedules whenever they change
  useEffect(() => {
    setIsSaving(true);
    try {
      onSaved(schedules, timezone);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [schedules, timezone]);

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
    </div>
  );
}
