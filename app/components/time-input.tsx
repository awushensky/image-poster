import { Clock } from "lucide-react";
import type { PostingTime } from "~/db/posting-time-database.server";

interface TimeInputProps {
  value: PostingTime;
  onChange: (time: PostingTime) => void;
}

export default function TimeInput({ value, onChange }: TimeInputProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Hour</label>
          <select
            value={value.hour}
            onChange={(e) => onChange({ ...value, hour: parseInt(e.target.value) })}
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i.toString().padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Minute</label>
          <select
            value={value.minute}
            onChange={(e) => onChange({ ...value, minute: parseInt(e.target.value) })}
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={0}>00</option>
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={45}>45</option>
          </select>
        </div>
      </div>
    </div>
  );
};
