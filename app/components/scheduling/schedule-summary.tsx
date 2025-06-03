import type { ProposedCronSchedule, User } from "~/model/model";
import ScheduleChart from "./schedule-chart";


interface ScheduleSummaryProps {
  user: User;
  schedules: ProposedCronSchedule[];
  onEdit?: () => void;
}

const ScheduleSummary: React.FC<ScheduleSummaryProps> = ({ user, schedules, onEdit }) => {
  const getTimezoneDisplay = (): string => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();

    const longName = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'long',
      timeZone: timeZone
    }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '';

    const shortName = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short',
      timeZone: timeZone
    }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '';

    return `${longName} (${shortName})`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Posting Schedule - {getTimezoneDisplay()}</h3>
        {onEdit === undefined ?
          <></>
          :
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {schedules.length === 0 ? "Set Schedule" : "Edit Schedule"}
          </button>
        }
      </div>

      {schedules.length <= 0 ? (
        <p className="text-gray-500">No posting schedule configured</p>
      ) : (
        <ScheduleChart user={user} schedules={schedules} />
      )}
    </div>
  );
};

export default ScheduleSummary;
