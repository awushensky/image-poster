import ScheduleSummary from "~/components/scheduling/schedule-summary";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/auth/session.server";
import ImageQueue from "~/components/image-queue/image-queue";
import PostedImages from "~/components/posted-image/posted-images";
import Tabs from "~/components/tabs";
import { useEffect, useState } from "react";
import { useRevalidator, useSearchParams } from "react-router";
import { getUserPostingSchedules } from "~/db/posting-schedule-database.server";
import UploadModal from "~/components/image-upload/upload-modal";
import ScheduleModal from "~/components/scheduling/schedule-modal";
import { Confirmation } from "~/components/confirmation";
import { getImageQueueSize } from "~/db/image-queue-database.server";
import { readPostedImageEntriesCount } from "~/db/posted-image-database.server";
import Layout from "~/components/layout";
import { ErrorBanner } from "~/components/error-banner";
import { cn, themeClasses } from "~/utils/theme";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const schedules = await getUserPostingSchedules(user.did);
  const initialQueuedImageCount = await getImageQueueSize(user.did);
  const initialPostedImageCount = await readPostedImageEntriesCount(user.did);
  
  return { user, schedules, initialQueuedImageCount, initialPostedImageCount };
}

type TabType = 'queue' | 'posted';

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, schedules, initialQueuedImageCount, initialPostedImageCount } = loaderData

  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [queueCount, setQueueCount] = useState(initialQueuedImageCount);
  const [postedCount, setPostedCount] = useState(initialPostedImageCount);
  const [error, setError] = useState<string | undefined>(undefined);

  const getActiveTabFromParams = (): TabType => {
    const tab = searchParams.get('tab');
    return (tab === 'posted' || tab === 'queue') ? tab : 'queue';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTabFromParams);

  useEffect(() => {
    setActiveTab(getActiveTabFromParams());
  }, [searchParams]);

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

  const handleLogoutClick = () => {
    setLogoutConfirmOpen(true);
  }

  const handleLogoutConfirm = () => {
    window.location.href = '/auth/logout';
  };

  const handleLogoutCancel = () => {
    setLogoutConfirmOpen(false);
  };

  const handleTabChange = (tabId: string) => {
    const newTab = tabId as TabType;
    setActiveTab(newTab);
    
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', newTab);
    setSearchParams(newSearchParams, { replace: true });
  };
  
  return (
    <Layout
      user={user}
      onLogoutClick={handleLogoutClick}>
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

      <main className="max-w-7xl mx-auto p-6">
        {error && (
          <ErrorBanner
            error={error}
            onDismiss={handleErrorDismiss}/>
        )}

        <ScheduleSummary
          schedules={schedules}
          timezone={user.timezone}
          onEdit={() => setScheduleModalOpen(true)}
        />

        {/* Images Section with Tabs */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className={cn(
              "text-2xl font-bold",
              themeClasses.primary
            )}>
              Images
            </h2>
            <button
              onClick={() => setUploadModalOpen(true)}
              className={cn(
                "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
                "text-white px-4 py-2 rounded-lg font-medium transition-colors",
                "flex items-center space-x-2",
                themeClasses.focus
              )}
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
              <span>Upload Images</span>
            </button>
          </div>

          <div className="mb-6">
            <Tabs
              tabs={[
                { id: 'queue', label: 'Queue', count: queueCount },
                { id: 'posted', label: 'Posted', count: postedCount }
              ]}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

          {activeTab === 'queue' && (
            <ImageQueue
              schedules={schedules}
              initialQueuedImageCount={initialQueuedImageCount}
              userTimezone={user.timezone}
              onChanged={handleImageQueueChanged}
              onError={handleImageQueueError}
            />
          )}

          {activeTab === 'posted' && (
            <PostedImages
              isVisible={true}
              initialPostedImageCount={initialPostedImageCount}
              onChanged={handlePostedImagesChanged}
              onError={handlePostedImagesError}
            />
          )}
        </div>
      </main>
    </Layout>
  );
}
