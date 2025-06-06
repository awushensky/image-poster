import ScheduleSummary from "~/components/scheduling/schedule-summary";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/auth/session.server";
import { readPostedImageEntries } from "~/db/posted-image-database.server";
import ImageQueue from "~/components/image-queue/image-queue";
import PostedImages from "~/components/posted-image/posted-images";
import Tabs from "~/components/tabs";
import Header from "~/components/header";
import { useEffect, useState } from "react";
import Modal from "~/components/modal";
import { useRevalidator } from "react-router";
import type { ProposedPostingSchedule } from "~/model/model";
import { getUserPostingSchedules } from "~/db/posting-schedule-database.server";
import ScheduleModalContent from "~/components/scheduling/schedule-modal-content";
import UploadModal from "~/components/image-upload/upload-modal";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const schedules = await getUserPostingSchedules(user.did);
  const postedImages = await readPostedImageEntries(user.did);
  
  return { user, schedules, postedImages };
}

type TabType = 'queue' | 'posted';

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, schedules, postedImages } = loaderData

  const revalidator = useRevalidator();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Reset modals whenever loader data changes
    setScheduleModalOpen(false);
    setUploadModalOpen(false);
  }, [loaderData]);

  const handleSettingsOpen = () => {
    setScheduleModalOpen(true);
  };

  const handleScheduleModalClose = () => {
    setScheduleModalOpen(false);
  };

  const handleScheduleModalSave = async (updatedSchedules: ProposedPostingSchedule[], timezone: string) => {
    const tasks = [];

    if (JSON.stringify(updatedSchedules) !== JSON.stringify(schedules)) {
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
      setScheduleModalOpen(false);
      revalidator.revalidate();
    } catch (error) {
      console.error('Failed to save schedule changes:', error);
      // Could show an error toast here
    }
  }

  const handleImagesUploaded = async () => {
    setUploadModalOpen(false);
    revalidator.revalidate();
  }

  const handleUploadCancel = () => {
    setUploadModalOpen(false);
  };

  const handleImageQueueChanged = (imageCount: number) => {
    // Update the tab count immediately for responsive UI
    setQueueCount(imageCount);
  };

  const handleLogout = () => {
    window.location.href = '/auth/logout';
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {scheduleModalOpen && (
        <Modal
          onClose={handleScheduleModalClose}
          title="Schedule">
            <ScheduleModalContent
              initialTimezone={user.timezone}
              initialSchedules={schedules}
              onSaved={handleScheduleModalSave}
              onCancel={handleScheduleModalClose}
            />
        </Modal>
      )}

      {uploadModalOpen && (
        <UploadModal
          onComplete={handleImagesUploaded}
          onCancel={handleUploadCancel}
        />
      )}

      <Header 
        user={user}
        onSettingsClick={handleSettingsOpen}
        onLogoutClick={handleLogout}
      />

      <main className={`max-w-7xl mx-auto p-6`}>
        <ScheduleSummary
          schedules={schedules}
          timezone={user.timezone}
          onEdit={() => setScheduleModalOpen(true)}
        />

        {/* Images Section with Tabs */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Images</h2>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Upload Images</span>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <Tabs
              tabs={[
                { id: 'queue', label: 'Queue', count: queueCount },
                { id: 'posted', label: 'Posted', count: postedImages.length }
              ]}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId as TabType) }
            />
          </div>

          {/* Tab Content */}
          {activeTab === 'queue' && (
            <ImageQueue
              schedules={schedules}
              userTimezone={user.timezone}
              onChanged={handleImageQueueChanged}
            />
          )}

          {activeTab === 'posted' && (
            <PostedImages
              images={postedImages}
            />
          )}
        </div>
      </main>
    </div>
  );
}
