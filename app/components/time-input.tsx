import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { PostingTime } from "~/lib/time";


interface TimeInputProps {
  value: PostingTime;
  onChange: (time: PostingTime) => void;
  className?: string;
}

export default function TimeInput({ value, onChange, className = "" }: TimeInputProps) {
  const [inputValue, setInputValue] = useState(`${value.hour.toString().padStart(2, '0')}:${value.minute.toString().padStart(2, '0')}`);
  const [isValid, setIsValid] = useState(true);

  const validateAndUpdateTime = (timeString: string) => {
    setInputValue(timeString);
    
    // Allow partial input while typing
    if (timeString.length < 5) {
      setIsValid(false);
      return;
    }

    // Parse time format HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const match = timeString.match(timeRegex);
    
    if (match) {
      const hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        setIsValid(true);
        onChange({ hour, minute });
      } else {
        setIsValid(false);
      }
    } else {
      setIsValid(false);
    }
  };

  const formatTime12Hour = (hour: number, minute: number) => {
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const incrementTime = (field: 'hour' | 'minute', delta: number) => {
    if (field === 'hour') {
      const newHour = (value.hour + delta + 24) % 24;
      onChange({ ...value, hour: newHour });
      setInputValue(`${newHour.toString().padStart(2, '0')}:${value.minute.toString().padStart(2, '0')}`);
    } else {
      const newMinute = (value.minute + delta + 60) % 60;
      onChange({ ...value, minute: newMinute });
      setInputValue(`${value.hour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => validateAndUpdateTime(e.target.value)}
          placeholder="HH:MM"
          className={`w-full px-3 py-2 border rounded-lg text-center font-mono text-lg ${
            isValid ? 'border-gray-300 focus:border-blue-500' : 'border-red-300 focus:border-red-500'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
        />
        {!isValid && (
          <div className="absolute right-2 top-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => incrementTime('hour', -1)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          >
            H-
          </button>
          <button
            type="button"
            onClick={() => incrementTime('hour', 1)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          >
            H+
          </button>
          <button
            type="button"
            onClick={() => incrementTime('minute', -15)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          >
            M-
          </button>
          <button
            type="button"
            onClick={() => incrementTime('minute', 15)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          >
            M+
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {isValid && formatTime12Hour(value.hour, value.minute)}
        </div>
      </div>
    </div>
  );
}
