import React, { useState, useEffect } from 'react';
import Modal from '~/components/modal';
import ScheduleModalContent from './schedule-modal-content';
import { parsePostingSchedule, type PostingSchedule, type ProposedPostingSchedule, type User } from '~/model/model';

interface ScheduleModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSaved: () => void;
  onError: (error: string) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  user,
  onClose,
  onSaved,
  onError
}) => {
  const [schedules, setSchedules] = useState<PostingSchedule[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchScheduleData();
    }
  }, [isOpen]);

  const fetchScheduleData = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch('/api/posting-schedules');
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load schedules');
      }

      const schedules = (data.schedules || []).map(parsePostingSchedule)
      setSchedules(schedules);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load schedule data';
      setLoadError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedSchedules: ProposedPostingSchedule[], timezone: string) => {
    const tasks = [];

    if (schedules && JSON.stringify(updatedSchedules) !== JSON.stringify(schedules)) {
      tasks.push(
        fetch('/api/posting-schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ schedules: updatedSchedules })
        }).then(async (response) => {
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || 'Failed to update schedules');
          }
          return result;
        })
      );
    }

    if (timezone !== user.timezone) {
      tasks.push(
        fetch('/api/user', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timezone })
        }).then(async (response) => {
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || 'Failed to update timezone');
          }
          return result;
        })
      );
    }

    try {
      await Promise.all(tasks);
      onClose();
      onSaved();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      onError(errorMessage);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      title="Schedule"
      closeEnabled={!isLoading}
    >
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading schedule data...</span>
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading schedule data
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {loadError}
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchScheduleData}
                  className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {schedules && !isLoading && !loadError && (
        <ScheduleModalContent
          initialTimezone={user.timezone}
          initialSchedules={schedules}
          onSaved={handleSave}
          onCancel={handleCancel}
        />
      )}
    </Modal>
  );
};

export default ScheduleModal;
