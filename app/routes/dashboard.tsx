import ScheduleSummary from "~/components/scheduling/schedule-summary";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/auth/session.server";
import { getImageQueueForUser } from "~/db/image-queue-database.server";
import ImageQueue from "~/components/image-queue/image-queue";
import Header from "~/components/header";
import { useEffect, useState } from "react";
import Modal from "~/components/modal";
import { estimateImageSchedule } from "~/lib/posting-time-estimator";
import { useRevalidator } from "react-router";
import type { ProposedPostingSchedule, ProposedQueuedImage, QueuedImage } from "~/model/model";
import { getUserPostingSchedules } from "~/db/posting-schedule-database.server";
import ScheduleModalContent from "~/components/scheduling/schedule-modal-content";
import UploadModal from "~/components/image-upload/upload-modal";
import { deleteImage, reorderImages, updateImage } from "~/lib/dashboard-utils";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const schedules = await getUserPostingSchedules(user.did);
  const loadedImages = await estimateImageSchedule(await getImageQueueForUser(user.did), schedules, user.timezone);
  
  return { user, schedules, loadedImages };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, schedules, loadedImages } = loaderData

  const revalidator = useRevalidator();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [images, setImages] = useState(loadedImages);

  useEffect(() => {
    // Reset state whenever loader data changes
    setImages(loadedImages);
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

  const handleImagesReordered = async (storageKey: string, destinationOrder: number) => {
    // reorder the images without the reload. this will make the UI feel more responsive.
    setImages(estimateImageSchedule(reorderImages(images, storageKey, destinationOrder), schedules, user.timezone));

    const formData = new FormData();
    formData.append('action', 'reorder');
    formData.append('toOrder', destinationOrder.toString());

    fetch(`/api/image/${storageKey}`, {
      method: 'PUT',
      body: formData,
    }).then(async response => {
      const result = await response.json();
      
      if (!result.success) {
        console.error('Failed to reorder image:', result.error);
        // Could show an error toast here
      }

      revalidator.revalidate();
    });
  }

  const handleImageUpdated = async (storageKey: string, update: Partial<ProposedQueuedImage>) => {
    // update the images without a reload. this will make the UI feel more responsive.
    setImages(estimateImageSchedule(updateImage(images, storageKey, update), schedules, user.timezone));

    const formData = new FormData();
    formData.append('action', 'update');
    
    if (update.postText !== undefined) {
      formData.append('postText', update.postText);
    }
    if (update.isNsfw !== undefined) {
      formData.append('isNsfw', update.isNsfw.toString());
    }

    fetch(`/api/image/${storageKey}`, {
      method: 'PUT',
      body: formData,
    }).then(async response => {
      const result = await response.json();
      
      if (!result.success) {
        console.error('Failed to update image:', result.error);
        // Could show an error toast here
      }

      revalidator.revalidate();
    });
  }

  const handleImageDelete = async (storageKey: string) => {
    // Delete the image without refreshing from the DB. this will make the UI feel more responsive.
    setImages(estimateImageSchedule(deleteImage(images, storageKey), schedules, user.timezone));

    fetch(`/api/image/${storageKey}`, {
      method: 'DELETE',
    }).then(async response => {
      const result = await response.json();
      if (!result.success) {
        console.error('Failed to delete image:', result.error);
        // Could show an error toast here
      }

      revalidator.revalidate();
    });
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
          schedules={schedules}
          timezone={user.timezone}
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
            onImagesReordered={handleImagesReordered}
            onImageUpdate={handleImageUpdated}
            onImageDelete={handleImageDelete}
          />
        </div>
      </main>
    </div>
  );
}
