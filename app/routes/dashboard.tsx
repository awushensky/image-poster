import ScheduleSummary from "~/components/scheduling/schedule-summary";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/lib/session.server";
import ImageUpload from "~/components/image-upload";
import uploadHandler from "~/lib/upload-handler.server";
import { parseFormData } from "@mjackson/form-data-parser";
import { getImageQueueForUser } from "~/db/image-queue-database.server";
import ImageQueue from "~/components/image-queue/image-queue";
import Header from "~/components/header";
import { useState } from "react";
import Modal from "~/components/modal";
import { estimateImageSchedule } from "~/lib/posting-time-estimator";
import { useFetcher } from "react-router";
import type { ProposedCronSchedule } from "~/model/model";
import { getUserPostingSchedules } from "~/db/posting-schedule-database.server";
import ScheduleModalContent from "~/components/scheduling/schedule-modal-content";


export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const schedules = await getUserPostingSchedules(user.did);
  const images = await estimateImageSchedule(await getImageQueueForUser(user.did), schedules);
  
  return { user, schedules, images };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  await parseFormData(
    request,
    uploadHandler(user, 'image', /^image\//),
  );
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
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

        <ImageUpload />

        <ImageQueue
          images={images}
          isLoading={isLoading}
          onImagesReordered={handleImagesReordered}
          onImageUpdate={handleImageUpdated}
          onImageDelete={handleImageDelete}
        />
      </main>
    </div>
  );
}
