import ScheduleSummary from "~/components/scheduling/schedule-summary";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/auth/session.server";
import ImageQueue from "~/components/image-queue/image-queue";
import PostedImages from "~/components/posted-image/posted-images";
import Tabs from "~/components/tabs";
import Header from "~/components/header";
import { useEffect, useState } from "react";
import { useRevalidator } from "react-router";
import { getUserPostingSchedules } from "~/db/posting-schedule-database.server";
import UploadModal from "~/components/image-upload/upload-modal";
import ScheduleModal from "~/components/scheduling/schedule-modal";
import { Confirmation } from "~/components/confirmation";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const schedules = await getUserPostingSchedules(user.did);
  
  return { user, schedules };
}

type TabType = 'queue' | 'posted';

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, schedules } = loaderData

  const revalidator = useRevalidator();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [queueCount, setQueueCount] = useState(0);
  const [postedCount, setPostedCount] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Reset modals whenever loader data changes
    setScheduleModalOpen(false);
    setUploadModalOpen(false);
    setLogoutConfirmOpen(false);
  }, [loaderData]);

  const handleSettingsOpen = () => {
    setScheduleModalOpen(true);
  };

  const handleScheduleModalClose = () => {
    setScheduleModalOpen(false);
  };

  const handleScheduleModalSaved = () => {
    revalidator.revalidate();
  };

  const handleScheduleModalError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleImagesUploaded = async () => {
    setUploadModalOpen(false);
    revalidator.revalidate();
  }

  const handleUploadCancel = () => {
    setUploadModalOpen(false);
  };

  const handleImageQueueChanged = (imageCount: number) => {
    setQueueCount(imageCount);
  };

  const handleImageQueueError = (errorMessage: string) => {
    setError(errorMessage);
  }

  const handlePostedImagesChanged = (imageCount: number) => {
    setPostedCount(imageCount);
  }

  const handlePostedImagesError = (errorMessage: string) => {
    setError(errorMessage);
  }

  const handleErrorDismiss = () => {
    setError(undefined);
  };

  const handleLogoutAttempt = () => {
    setLogoutConfirmOpen(true);
  }

  const handleLogoutConfirm = () => {
    window.location.href = '/auth/logout';
  };

  const handleLogoutCancel = () => {
    setLogoutConfirmOpen(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <ScheduleModal
        isOpen={scheduleModalOpen}
        user={user}
        onClose={handleScheduleModalClose}
        onSaved={handleScheduleModalSaved}
        onError={handleScheduleModalError}
      />

      {uploadModalOpen && (
        <UploadModal
          onComplete={handleImagesUploaded}
          onCancel={handleUploadCancel}
        />
      )}

      {logoutConfirmOpen && (
        <Confirmation
          title="Confirm Logout"
          message="Are you sure you want to log out?"
          warning="Logging out will prevent the application from continuing to post images to Bluesky on your behalf. Your scheduled posts will not be published until you log back in."
          confirmText="Log Out"
          onCancel={handleLogoutCancel}
          onConfirm={handleLogoutConfirm}
        />
      )}

      <Header 
        user={user}
        onLogoutClick={handleLogoutAttempt}
      />

      <main className={`max-w-7xl mx-auto p-6`}>
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex justify-between items-start">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
              <button
                onClick={handleErrorDismiss}
                className="ml-3 text-red-400 hover:text-red-600 transition-colors"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
                { id: 'posted', label: 'Posted', count: postedCount }
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
              onError={handleImageQueueError}
            />
          )}

          {activeTab === 'posted' && (
            <PostedImages
              isVisible={true}
              onChanged={handlePostedImagesChanged}
              onError={handlePostedImagesError}
            />
          )}
        </div>
      </main>
    </div>
  );
}
