import ScheduleSummary from "~/components/scheduling/schedule-summary";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/lib/session.server";
import { getImageQueueForUser } from "~/db/image-queue-database.server";
import ImageQueue from "~/components/image-queue/image-queue";
import Header from "~/components/header";
import { useState } from "react";
import Modal from "~/components/modal";
import { estimateImageSchedule } from "~/lib/posting-time-estimator";
import { useFetcher, useRevalidator } from "react-router";
import type { ProposedCronSchedule } from "~/model/model";
import { getUserPostingSchedules } from "~/db/posting-schedule-database.server";
import ScheduleModalContent from "~/components/scheduling/schedule-modal-content";
import UploadModal from "~/components/image-upload/upload-modal";


export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const schedules = await getUserPostingSchedules(user.did);
  const images = await estimateImageSchedule(await getImageQueueForUser(user.did), schedules);
  
  return { user, schedules, images };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const { user, schedules, images } = loaderData;

  const handleSettingsOpen = () => {
    setScheduleModalOpen(true);
  };

  const handleScheduleModalClose = () => {
    setScheduleModalOpen(false);
  };

  const handleScheduleModalSave = async (updatedSchedules: ProposedCronSchedule[], timezone: string) => {
    const tasks = [];

    if (JSON.stringify(updatedSchedules) !== JSON.stringify(schedules)) {
      tasks.push(fetcher.submit(
        { schedules: JSON.stringify(updatedSchedules) },
        { method: "POST", action: "/api/posting-schedules" }
      ));
    }

    if (timezone !== user.timezone) {
      tasks.push(
      fetcher.submit(
        { timezone },
        { method: 'PUT', action: '/api/user' }
      ));
    }

    await Promise.all(tasks);
    setScheduleModalOpen(false);
  }

  const handleImagesUploaded = async () => {
    setUploadModalOpen(false);
    revalidator.revalidate();
  }

  const handleUploadCancel = () => {
    setUploadModalOpen(false);
  };

  const handleImagesReordered = async (storageKey: string, destinationOrder: number) => {
    setLoading(true);
    await fetcher.submit(
      {
        action: 'reorder',
        toOrder: destinationOrder,
      },
      { method: 'PUT', action: `/api/image/${storageKey}` }
    );
    setLoading(false);
  }

  const handleImageUpdated = async (storageKey: string, update: Partial<{ postText: string, isNsfw: boolean }>) => {
    setLoading(true);
    await fetcher.submit(
      {
        action: 'update',
        ...update
      },
      { method: 'PUT', action: `/api/image/${storageKey}` }
    );
    setLoading(false);
  }

  const handleImageDelete = async (storageKey: string) => {
    setLoading(true);
    await fetcher.submit({}, { method: 'DELETE', action: `/api/image/${storageKey}` });
    setLoading(false);
  }

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
          user={user}
          schedules={schedules}
          onEdit={() => setScheduleModalOpen(true)}
        />

        {/* Image Queue Section with Upload Button */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Image Queue</h2>
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

          <ImageQueue
            images={images}
            isLoading={isLoading}
            onImagesReordered={handleImagesReordered}
            onImageUpdate={handleImageUpdated}
            onImageDelete={handleImageDelete}
          />
        </div>
      </main>
    </div>
  );
}
