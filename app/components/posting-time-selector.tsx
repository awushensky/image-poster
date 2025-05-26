import React, { useState } from 'react';
import { Clock, Plus, X, Calendar, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import TimeInput from './time-input';


interface PostingTimesSelectorProps {
  initialTimes?: PostingTime[];
  onChange?: (times: PostingTime[]) => void;
}

export interface PostingTime {
  hour: number;
  minute: number;
  days?: number[];
}

// Optimized for furry fandom demographics: 18-25, US coasts, tech/university
const FURRY_FANDOM_PRESETS = [
  { 
    label: 'Evening Social Hours', 
    description: 'Peak online time after work/classes (7-9 PM)',
    times: [
      { hour: 19, minute: 0 }, // 7 PM
      { hour: 21, minute: 0 }  // 9 PM
    ] 
  },
  { 
    label: 'Art Showcase Schedule', 
    description: 'Optimal for art posts when artists and fans are active',
    times: [
      { hour: 18, minute: 30 }, // 6:30 PM
      { hour: 20, minute: 30 }, // 8:30 PM
      { hour: 22, minute: 0 }   // 10 PM
    ] 
  },
  { 
    label: 'Weekday After-Work', 
    description: 'Evening posts for weekdays only',
    times: [
      { hour: 18, minute: 0, days: [1, 2, 3, 4, 5] }, // Mon-Fri 6 PM
      { hour: 20, minute: 30, days: [1, 2, 3, 4, 5] }  // Mon-Fri 8:30 PM
    ] 
  },
  { 
    label: 'Weekend Relaxed', 
    description: 'Later morning and afternoon posts for weekends',
    times: [
      { hour: 11, minute: 0, days: [6, 0] }, // Sat-Sun 11 AM
      { hour: 15, minute: 0, days: [6, 0] }, // Sat-Sun 3 PM
      { hour: 19, minute: 30, days: [6, 0] }  // Sat-Sun 7:30 PM
    ] 
  },
  { 
    label: 'Mixed Week Schedule', 
    description: 'Different times for weekdays vs weekends',
    times: [
      { hour: 19, minute: 0, days: [1, 2, 3, 4, 5] }, // Weekday evening
      { hour: 21, minute: 30, days: [1, 2, 3, 4, 5] }, // Weekday night
      { hour: 12, minute: 0, days: [6, 0] },           // Weekend lunch
      { hour: 18, minute: 0, days: [6, 0] }            // Weekend dinner
    ] 
  },
  { 
    label: 'NSFW Night Schedule', 
    description: 'Late evening for mature content (10 PM-12 AM)',
    times: [
      { hour: 22, minute: 0 },  // 10 PM
      { hour: 23, minute: 30 }  // 11:30 PM
    ] 
  },
  { 
    label: 'Fursuit Friday Special', 
    description: 'Friday evening for fursuit and costume content',
    times: [
      { hour: 17, minute: 30, days: [5] }, // Friday 5:30 PM
      { hour: 19, minute: 0, days: [5] }   // Friday 7 PM
    ] 
  },
  { 
    label: 'University Schedule', 
    description: 'Times that work around typical class schedules',
    times: [
      { hour: 12, minute: 30 }, // Lunch break
      { hour: 17, minute: 0 },  // After classes
      { hour: 21, minute: 0 }   // Evening study break
    ] 
  }
];

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function PostingTimesSelector({ 
  initialTimes = [], 
  onChange
}: PostingTimesSelectorProps) {
  const [selectedTimes, setSelectedTimes] = useState<PostingTime[]>(initialTimes);
  const [newTime, setNewTime] = useState<PostingTime>({ hour: 19, minute: 0 });
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [showDaySelector, setShowDaySelector] = useState(false);

  const formatTime = (time: PostingTime) => {
    const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
    const ampm = time.hour < 12 ? 'AM' : 'PM';
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour12}:${minute} ${ampm}`;
  };

  const formatTimeWithDays = (time: PostingTime) => {
    const timeStr = formatTime(time);
    if (!time.days || time.days.length === 0 || time.days.length === 7) {
      return `${timeStr} (Daily)`;
    }
    
    // Handle weekday/weekend shortcuts
    const weekdays = [1, 2, 3, 4, 5];
    const weekends = [0, 6];
    
    if (time.days.length === 5 && weekdays.every(d => time.days!.includes(d))) {
      return `${timeStr} (Weekdays)`;
    }
    if (time.days.length === 2 && weekends.every(d => time.days!.includes(d))) {
      return `${timeStr} (Weekends)`;
    }
    
    const dayNames = time.days.map(d => DAYS_OF_WEEK[d].slice(0, 3)).join(', ');
    return `${timeStr} (${dayNames})`;
  };

  const sortTimes = (times: PostingTime[]) => {
    return [...times].sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });
  };

  const timeExists = (time: PostingTime) => {
    return selectedTimes.some(t => 
      t.hour === time.hour && 
      t.minute === time.minute &&
      JSON.stringify(t.days || []) === JSON.stringify(time.days || [])
    );
  };

  const addTime = () => {
    if (timeExists(newTime)) return;

    const timeToAdd = { 
      ...newTime, 
      days: newTime.days && newTime.days.length > 0 ? newTime.days : undefined 
    };
    const updated = sortTimes([...selectedTimes, timeToAdd]);
    setSelectedTimes(updated);
    onChange?.(updated);
  };

  const removeTime = (timeToRemove: PostingTime) => {
    const updated = selectedTimes.filter(t => 
      !(t.hour === timeToRemove.hour && 
        t.minute === timeToRemove.minute &&
        JSON.stringify(t.days || []) === JSON.stringify(timeToRemove.days || []))
    );
    setSelectedTimes(updated);
    onChange?.(updated);
  };

  const applyPreset = (preset: typeof FURRY_FANDOM_PRESETS[0]) => {
    const updated = sortTimes(preset.times);
    setSelectedTimes(updated);
    onChange?.(updated);
  };

  const clearAll = () => {
    setSelectedTimes([]);
    onChange?.([]);
  };

  const toggleDay = (day: number) => {
    const currentDays = newTime.days || [];
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    
    setNewTime({ ...newTime, days: updatedDays });
  };

  const addWeekdays = () => {
    setNewTime({ ...newTime, days: [1, 2, 3, 4, 5] });
  };

  const addWeekends = () => {
    setNewTime({ ...newTime, days: [0, 6] });
  };

  const getTimelineDots = () => {
    const hours = Array(24).fill(0);
    selectedTimes.forEach(time => {
      hours[time.hour]++;
    });
    return hours;
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Posting Schedule</h3>
      </div>

      {/* 24-Hour Overview */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">24-Hour Overview</h4>
        <div className="relative">
          <div className="flex justify-between items-center h-8 bg-gray-100 rounded-lg px-2">
            {getTimelineDots().map((count, hour) => (
              <div
                key={hour}
                className="relative flex-1 flex justify-center items-center"
                title={`${hour}:00 - ${count > 0 ? `${count} post${count > 1 ? 's' : ''} scheduled` : 'No posts scheduled'}`}
              >
                {count > 0 && (
                  <div className="relative">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    {count > 1 && (
                      <div className="absolute -top-2 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {count}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1 px-2">
            <span>12A</span>
            <span>6A</span>
            <span>12P</span>
            <span>6P</span>
            <span>11P</span>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="border-t pt-4">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('presets')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'presets' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Community Presets
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'custom' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Custom Schedule
          </button>
        </div>

        {mode === 'presets' && selectedTimes.length > 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> Selecting a preset will replace your current schedule.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Presets Mode */}
      {mode === 'presets' && (
        <div>
          <div className="grid grid-cols-1 gap-3">
            {FURRY_FANDOM_PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => applyPreset(preset)}
                className="p-4 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="font-medium text-sm mb-1">{preset.label}</div>
                <div className="text-xs text-gray-600 mb-2">{preset.description}</div>
                <div className="text-xs text-gray-500">
                  {preset.times.slice(0, 3).map(formatTimeWithDays).join(', ')}
                  {preset.times.length > 3 && ` +${preset.times.length - 3} more`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Mode */}
      {mode === 'custom' && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Add Custom Time</h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <TimeInput
                value={newTime}
                onChange={setNewTime}
              />
              
              <button
                onClick={() => setShowDaySelector(!showDaySelector)}
                className="flex items-center justify-between w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium">
                  {newTime.days && newTime.days.length > 0 && newTime.days.length < 7
                    ? `Selected: ${formatTimeWithDays({ hour: 0, minute: 0, days: newTime.days }).replace('12:00 AM (', '').replace(')', '')}`
                    : 'Post every day'
                  }
                </span>
                {showDaySelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDaySelector && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={addWeekdays}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                    >
                      Weekdays
                    </button>
                    <button
                      onClick={addWeekends}
                      className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                    >
                      Weekends
                    </button>
                    <button
                      onClick={() => setNewTime({ ...newTime, days: [] })}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
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
                          (newTime.days || []).includes(index)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start">
              <button
                onClick={addTime}
                disabled={timeExists(newTime)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Time
              </button>
            </div>
          </div>

          {timeExists(newTime) && (
            <p className="text-sm text-red-600">This exact time and day combination is already selected</p>
          )}
        </div>
      )}

      {/* Selected Times List */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            Active Schedule ({selectedTimes.length} times)
          </h4>
          {selectedTimes.length > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        
        {selectedTimes.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {selectedTimes.map((time, index) => (
              <div
                key={`${time.hour}-${time.minute}-${JSON.stringify(time.days)}`}
                className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-blue-900">
                    {formatTimeWithDays(time)}
                  </span>
                  <span className="text-xs text-blue-600">
                    {time.hour.toString().padStart(2, '0')}:{time.minute.toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={() => removeTime(time)}
                  className="text-blue-600 hover:text-red-600 transition-colors p-1"
                  title="Remove this time"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No posting times scheduled</p>
            <p className="text-xs">Choose a preset or add custom times</p>
          </div>
        )}
      </div>
    </div>
  );
}
