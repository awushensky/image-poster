import type { PostingTime } from "~/lib/time";

interface PostingSummaryProps {
  times: PostingTime[];
  className?: string;
  onEdit?: () => void;
  showEditButton?: boolean;
}

export function PostingSummary({ times, className = "", onEdit, showEditButton = false }: PostingSummaryProps) {
  const formatTime = (time: PostingTime) => {
    const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
    const ampm = time.hour < 12 ? 'AM' : 'PM';
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour12}:${minute} ${ampm}`;
  };

  if (times.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium text-gray-600 mb-1">Posting Schedule</h5>
            <p className="text-sm text-gray-500">No posting times configured</p>
          </div>
          {showEditButton && onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Set Up
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors ${className}`} onClick={onEdit}>
      <div className="flex items-center justify-between">
        <div>
          <h5 className="font-medium text-green-800 mb-2">Posting Schedule</h5>
          <p className="text-sm text-green-700">
            Images posted <strong>{times.length} times per day</strong> at:
          </p>
          <div className="mt-2 text-sm text-green-700">
            {times.map(formatTime).join(' • ')}
          </div>
        </div>
        {showEditButton && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
