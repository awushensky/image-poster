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
import type { PostingTime, ProposedCronSchedule } from "~/model/model";
import { convertPostingTimesToUTC } from "~/lib/posting-time-zone-converter";
import ScheduleEditor from "~/components/scheduling/schedule-editor";
import { getUserPostingSchedules } from "~/db/posting-schedule-database.server";


export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const schedules = await getUserPostingSchedules(user.did);
  const images = await estimateImageSchedule(await getImageQueueForUser(user.did), schedules);
  // const images = estimateImagePostingTimes(await getImageQueueForUser(user.did), postingTimes);
  
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

  const handleAddSchedule = async (schedule: ProposedCronSchedule) => {
    setLoading(true);
    await fetcher.submit(
      { schedule: JSON.stringify(schedule) },
      { method: 'POST', action: '/api/posting-schedules' }
    );
    setLoading(false);
  }

  const handleToggleSchedule = async (scheduleId: number, active: boolean) => {
    setLoading(true);
    await fetcher.submit(
      { update: JSON.stringify({ active }) },
      { method: 'PUT', action: `/api/posting-schedules/${scheduleId}` }
    );
    setLoading(false);
  }

  const handleDeleteSchedule = async (scheduleId: number) => {
    setLoading(true);
    await fetcher.submit(
      { scheduleId: scheduleId.toString() },
      { method: 'DELETE', action: `/api/posting-schedules/${scheduleId}` }
    );
    setLoading(false);
  }

  const setUserTimezone = async (timezone: string) => {
    setLoading(true);
    await fetcher.submit(
      { timezone },
      { method: 'PUT', action: '/api/user/timezone' }
    );
    setLoading(false);
  }

  const handleScheduleModalSave = async (postingTimes: PostingTime[]) => {
    fetcher.submit(
      { values: JSON.stringify(convertPostingTimesToUTC(postingTimes, user.timezone)) },
      { method: "POST", action: "/api/posting-times" }
    );
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
            {/* <ScheduleModalContent
              initialPostingTimes={postingTimes}
              onSaved={handleScheduleModalSave}
              onCancel={handleScheduleModalClose}
            /> */}
            <ScheduleEditor
              user={user}
              schedules={schedules}
              onAddSchedule={handleAddSchedule}
              onToggleSchedule={handleToggleSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onTimezoneChange={setUserTimezone}
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
          schedule={[]}
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
