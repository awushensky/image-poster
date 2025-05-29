import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DAYS_OF_WEEK, WEEKDAYS, WEEKENDS } from '~/model/model';


interface DaysOfWeekInputProps {
  selectedDays?: number[];
  onChange: (days: number[]) => void;
}

const DaysOfWeekInput = ({
  selectedDays = [],
  onChange
}: DaysOfWeekInputProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatSelectedDays = (days: number[]) => {
    if (days.length === 0 || days.length === 7) {
      return 'Every day';
    }
    
    if (days.length === 5 && WEEKDAYS.every(d => days.includes(d))) {
      return 'Weekdays';
    }
    
    if (days.length === 2 && WEEKENDS.every(d => days.includes(d))) {
      return 'Weekends';
    }
    
    if (days.length <= 3) {
      return days.map(d => DAYS_OF_WEEK[d].slice(0, 3)).join(', ');
    }
    
    return `${days.length} days selected`;
  };

  const toggleDay = (dayIndex: number) => {
    const updatedDays = selectedDays.includes(dayIndex)
      ? selectedDays.filter(d => d !== dayIndex)
      : [...selectedDays, dayIndex].sort();
    
    onChange(updatedDays);
  };

  const selectWeekdays = () => {
    onChange(WEEKDAYS);
  };

  const selectWeekends = () => {
    onChange(WEEKENDS);
  };

  const clearSelection = () => {
    onChange([]);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors"
        type="button"
      >
        <span className="text-sm font-medium">
          {formatSelectedDays(selectedDays)}
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-3">
          <div className="flex gap-2">
            <button
              onClick={selectWeekdays}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
              type="button"
            >
              Weekdays
            </button>
            <button
              onClick={selectWeekends}
              className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
              type="button"
            >
              Weekends
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
              type="button"
            >
              Clear
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {DAYS_OF_WEEK.map((day, index) => (
              <button
                key={index}
                onClick={() => toggleDay(index)}
                className={`p-2 text-xs rounded transition-colors ${
                  selectedDays.includes(index)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
                type="button"
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default DaysOfWeekInput;
