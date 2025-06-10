import React, { useState, useEffect } from 'react';
import Modal from '~/components/modal';
import ScheduleModalContent from './schedule-modal-content';
import { type ProposedPostingSchedule } from "~/model/posting-schedules";
import { type PostingSchedule } from "~/model/posting-schedules";
import { type User } from "~/model/user";
import { updatePostingSchedules } from "~/api-interface/posting-schedules";
import { fetchPostingSchedules } from "~/api-interface/posting-schedules";
import { updateUser } from '~/api-interface/user';

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
      setSchedules(await fetchPostingSchedules());
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
      tasks.push(updatePostingSchedules(updatedSchedules));
    }

    if (timezone !== user.timezone) {
      tasks.push(updateUser({ timezone }));
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading schedule data...</span>
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading schedule data
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {loadError}
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchScheduleData}
                  className="text-sm bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
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
