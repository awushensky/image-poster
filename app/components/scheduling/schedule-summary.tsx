import type { ProposedPostingSchedule } from "~/model/model";
import ScheduleChart from "./schedule-chart";


interface ScheduleSummaryProps {
  schedules: ProposedPostingSchedule[];
  timezone: string;
  onEdit?: () => void;
}

const ScheduleSummary: React.FC<ScheduleSummaryProps> = ({ schedules, timezone, onEdit }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Posting Schedule - {timezone}</h3>
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
        <ScheduleChart schedules={schedules} timezone={timezone} />
      )}
    </div>
  );
};

export default ScheduleSummary;
