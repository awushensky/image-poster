import React, { useState } from 'react';
import { Clock, Plus, X, Calendar } from 'lucide-react';
import TimeInput from './time-input-old';
import DaysOfWeekInput from './days-of-week-input-old';
import { DAYS_OF_WEEK, WEEKDAYS, WEEKENDS, type PostingTime } from '~/model/model';


interface PostingTimesSelectorProps {
  initialTimes?: PostingTime[];
  onChange?: (times: PostingTime[]) => void;
}

interface SelectedDayTimes {
  hour: number;
  minute: number;
  days: number[];
}

export default function PostingTimesSelector({
  initialTimes = [],
  onChange
}: PostingTimesSelectorProps) {
  const [selectedTimes, setSelectedTimes] = useState<PostingTime[]>(initialTimes);
  const [newTime, setNewTime] = useState<SelectedDayTimes>({
    hour: 19,
    minute: 0,
    days: []
  });


  const formatTime = (hour: number, minute: number) => {
    const hourStr = hour.toString().padStart(2, '0');
    const minuteStr = minute.toString().padStart(2, '0');
    return `${hourStr}:${minuteStr}`;
  };

  const sortTimes = (times: PostingTime[]) => {
    return [...times].sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });
  };

  const addTime = () => {
    const daysToAdd = newTime.days.length > 0 ? newTime.days : [0, 1, 2, 3, 4, 5, 6];
    
    // Filter out days that already have this exact time
    const newDays = daysToAdd.filter(day => 
      !selectedTimes.some(t => 
        t.hour === newTime.hour && 
        t.minute === newTime.minute && 
        t.day_of_week === day
      )
    );

    if (newDays.length === 0) return;

    // Create new PostingTime entries for each new day
    const newEntries: PostingTime[] = newDays.map(day => ({
      hour: newTime.hour,
      minute: newTime.minute,
      day_of_week: day
    }));

    const updated = sortTimes([...selectedTimes, ...newEntries]);
    setSelectedTimes(updated);
    onChange?.(updated);
    
    // Reset days selection after adding
    setNewTime(prev => ({ ...prev, days: [] }));
  };

  const removeTime = (timeToRemove: PostingTime) => {
    const updated = selectedTimes.filter(t => 
      !(t.hour === timeToRemove.hour && 
        t.minute === timeToRemove.minute &&
        t.day_of_week === timeToRemove.day_of_week)
    );
    setSelectedTimes(updated);
    onChange?.(updated);
  };

  const clearAll = () => {
    setSelectedTimes([]);
    onChange?.([]);
  };

  const handleTimeChange = (time: { hour: number; minute: number }) => {
    setNewTime(prev => ({ ...prev, ...time }));
  };

  const handleDayChange = (days: number[]) => {
    setNewTime(prev => ({ ...prev, days }));
  };

  // Group times by hour/minute for display
  const groupedTimes = selectedTimes.reduce((groups, time) => {
    const key = `${time.hour}:${time.minute}`;
    if (!groups[key]) {
      groups[key] = {
        hour: time.hour,
        minute: time.minute,
        days: []
      };
    }
    groups[key].days.push(time.day_of_week);
    return groups;
  }, {} as Record<string, { hour: number; minute: number; days: number[] }>);

  const formatGroupedTime = (group: { hour: number; minute: number; days: number[] }) => {
    const timeStr = formatTime(group.hour, group.minute);
    const sortedDays = [...group.days].sort();
    
    if (sortedDays.length === 7) {
      return `${timeStr} (Daily)`;
    }
    
    if (sortedDays.length === 5 && WEEKDAYS.every(d => sortedDays.includes(d)) && 
        sortedDays.every(d => WEEKDAYS.includes(d))) {
      return `${timeStr} (Weekdays)`;
    }
    if (sortedDays.length === 2 && WEEKENDS.every(d => sortedDays.includes(d)) && 
        sortedDays.every(d => WEEKENDS.includes(d))) {
      return `${timeStr} (Weekends)`;
    }
    
    const dayNames = sortedDays.map(d => DAYS_OF_WEEK[d].slice(0, 3)).join(', ');
    return `${timeStr} (${dayNames})`;
  };

  const canAddTime = () => {
    const daysToCheck = newTime.days.length > 0 ? newTime.days : [0, 1, 2, 3, 4, 5, 6];
    return daysToCheck.some(day => 
      !selectedTimes.some(t => 
        t.hour === newTime.hour && 
        t.minute === newTime.minute && 
        t.day_of_week === day
      )
    );
  };

  const getConflictingDays = () => {
    const daysToCheck = newTime.days.length > 0 ? newTime.days : [0, 1, 2, 3, 4, 5, 6];
    return daysToCheck.filter(day => 
      selectedTimes.some(t => 
        t.hour === newTime.hour && 
        t.minute === newTime.minute && 
        t.day_of_week === day
      )
    );
  };

  const getNewDaysCount = () => {
    const daysToCheck = newTime.days.length > 0 ? newTime.days : [0, 1, 2, 3, 4, 5, 6];
    return daysToCheck.filter(day => 
      !selectedTimes.some(t => 
        t.hour === newTime.hour && 
        t.minute === newTime.minute && 
        t.day_of_week === day
      )
    ).length;
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Posting Schedule</h3>
      </div>

      {/* Time input */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Add Posting Time</h4>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <TimeInput
              value={{hour: newTime.hour, minute: newTime.minute}}
              onChange={handleTimeChange}
            />
            
            <DaysOfWeekInput
              selectedDays={newTime.days}
              onChange={handleDayChange}
            />
          </div>

          <div className="flex items-start">
            <button
              onClick={addTime}
              disabled={!canAddTime()}
              title={!canAddTime() ? `This time already exists for: ${getConflictingDays().map(day => DAYS_OF_WEEK[day]).join(', ')}` : undefined}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {getNewDaysCount() > 0 ? `Add Time (${getNewDaysCount()} days)` : 'Add Time'}
            </button>
          </div>
        </div>
      </div>

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
          <div className="space-y-2">
            {/* Grouped view */}
            <div className="grid grid-cols-1 gap-2">
              {Object.values(groupedTimes)
                .sort((a, b) => {
                  if (a.hour !== b.hour) return a.hour - b.hour;
                  return a.minute - b.minute;
                })
                .map((group) => (
                <div
                  key={`${group.hour}-${group.minute}`}
                  className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-blue-900">
                        {formatGroupedTime(group)}
                      </span>
                      <span className="text-xs text-blue-600">
                        {group.hour.toString().padStart(2, '0')}:{group.minute.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        // Remove all times for this hour/minute combination
                        const updated = selectedTimes.filter(t => 
                          !(t.hour === group.hour && t.minute === group.minute)
                        );
                        setSelectedTimes(updated);
                        onChange?.(updated);
                      }}
                      className="text-blue-600 hover:text-red-600 transition-colors p-1"
                      title="Remove all times for this schedule"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Individual day entries for granular control */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.days.sort().map(day => (
                      <button
                        key={day}
                        onClick={() => {
                          const timeToRemove = selectedTimes.find(t => 
                            t.hour === group.hour && 
                            t.minute === group.minute && 
                            t.day_of_week === day
                          );
                          if (timeToRemove) removeTime(timeToRemove);
                        }}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-red-100 hover:text-red-700 transition-colors"
                        title={`Remove ${DAYS_OF_WEEK[day]}`}
                      >
                        {DAYS_OF_WEEK[day].slice(0, 3)}
                        <X className="w-3 h-3 inline ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No posting times scheduled</p>
            <p className="text-xs">Choose days and add times to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
