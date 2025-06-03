import { dayLabels, dayNames } from "~/lib/time-utils";


interface DaysOfWeekInputProps {
  title: string;
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

export function DaysOfWeekInput({
  title,
  selectedDays,
  onChange,
}: DaysOfWeekInputProps) {
  const toggleDay = (day: number) => {
    const newSelectedDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    const newSelectedDaysSorted = newSelectedDays.sort((a, b) => a - b);
    onChange(newSelectedDaysSorted);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{title}</label>
      <div className="flex gap-1">
        {dayLabels.map((label, index) => (
          <button
            key={index}
            onClick={() => toggleDay(index)}
            title={dayNames[index]}
            className={`w-8 h-8 rounded border text-xs transition-colors ${
              selectedDays.includes(index)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-blue-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
