import ScheduleSummary from "~/components/schedule-summary";
import type { Route } from "./+types/dashboard";
import { getUserPostingTimes } from "~/db/posting-time-database.server";
import { requireUser } from "~/lib/session.server";
import ImageUpload from "~/components/image-upload";
import uploadHandler from "~/lib/upload-handler.server";
import { parseFormData } from "@mjackson/form-data-parser";
import { getImageQueueForUser } from "~/db/image-queue-database.server";
import ImageList from "~/components/image-list";
import Header from "~/components/header";
import { useState } from "react";
import Modal from "~/components/modal";
import ScheduleModalContent from "~/components/schedule-modal-content";
import { estimateImagePostingTimes } from "~/lib/posting-time-estimator";


export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const postingTimes = await getUserPostingTimes(user.did);
  const images = estimateImagePostingTimes(await getImageQueueForUser(user.did), postingTimes);
  
  return { user, images, postingTimes };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  await parseFormData(
    request,
    uploadHandler(user, 'image', /^image\//),
  );
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const { user, images, postingTimes } = loaderData;

  const handleSettingsOpen = () => {
    setScheduleModalOpen(true);
  };

  const handleScheduleModalClose = () => {
    setScheduleModalOpen(false);
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
              initialPostingTimes={postingTimes}
              onSaved={(postingTimes) => { handleScheduleModalClose() }}
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
          schedule={postingTimes}
          onEdit={() => setScheduleModalOpen(true)}
        />

        <ImageUpload />

        <ImageList images={images}/>
      </main>
    </div>
  );
}
