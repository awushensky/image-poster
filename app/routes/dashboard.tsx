import { useNavigate } from "react-router";
import { PostingSummary } from "~/components/posting-summary";
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
import SettingsModalContent from "~/components/settings-modal-content";
import type { PostingTime } from "~/components/posting-time-selector";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const images = await getImageQueueForUser(user.did);
  const postingTimes = await getUserPostingTimes(user.did);
  
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
  const navigate = useNavigate();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { user, images, postingTimes } = loaderData;

  const handleSettingsOpen = () => {
    setSettingsModalOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsModalOpen(false);
  };

  const handleLogout = () => {
    window.location.href = '/auth/logout';
  }

  const handleSaveSettings = async (newPostingTimes: PostingTime[]) => {
  }
  
  return (
    <div className="space-y-6">
      {settingsModalOpen && (
        <Modal
          onClose={handleSettingsClose}
          title="Settings">
            <SettingsModalContent
              initialPostingTimes={postingTimes}
              onSave={handleSaveSettings}
              onCancel={handleSettingsClose}
            />
        </Modal>
      )}

      <Header 
        user={user}
        onSettingsClick={handleSettingsOpen}
        onLogoutClick={handleLogout}
      />

      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <PostingSummary 
        times={postingTimes}
        className="mb-6"
        showEditButton={true}
        onEdit={() => navigate('/settings/posting-schedule')}
      />

      <ImageUpload />

      <ImageList images={images}/>
      
      {/* Other dashboard content */}
    </div>
  );
}
