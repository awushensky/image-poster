import React, { useState } from 'react';
import { Clock, Plus, X, Calendar, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { PostingTime } from '~/lib/time';
import TimeInput from './time-input';
import { PostingSummary } from './posting-summary';

interface PostingTimesSelectorProps {
  initialTimes?: PostingTime[];
  onChange?: (times: PostingTime[]) => void;
}

const QUICK_PRESETS = [
  { label: 'Morning (9 AM)', times: [{ hour: 9, minute: 0 }] },
  { label: 'Lunch (12 PM)', times: [{ hour: 12, minute: 0 }] },
  { label: 'Evening (6 PM)', times: [{ hour: 18, minute: 0 }] },
  { 
    label: 'Social Media Peak', 
    times: [
      { hour: 8, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 17, minute: 0 },
      { hour: 20, minute: 0 }
    ] 
  },
  { 
    label: 'Every 4 Hours', 
    times: [
      { hour: 6, minute: 0 },
      { hour: 10, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 18, minute: 0 },
      { hour: 22, minute: 0 }
    ] 
  },
  { 
    label: 'Every 2 Hours (8AM-10PM)', 
    times: [
      { hour: 8, minute: 0 },
      { hour: 10, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 16, minute: 0 },
      { hour: 18, minute: 0 },
      { hour: 20, minute: 0 },
      { hour: 22, minute: 0 }
    ] 
  },
];

export default function PostingTimesSelector({ 
  initialTimes = [], 
  onChange
}: PostingTimesSelectorProps) {
  const [selectedTimes, setSelectedTimes] = useState<PostingTime[]>(initialTimes);
  const [newTime, setNewTime] = useState<PostingTime>({ hour: 9, minute: 0 });
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');

  const formatTime = (time: PostingTime) => {
    const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
    const ampm = time.hour < 12 ? 'AM' : 'PM';
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour12}:${minute} ${ampm}`;
  };

  const formatTime24 = (time: PostingTime) => {
    const hour = time.hour.toString().padStart(2, '0');
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour}:${minute}`;
  };

  const sortTimes = (times: PostingTime[]) => {
    return [...times].sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });
  };

  const timeExists = (time: PostingTime) => {
    return selectedTimes.some(t => t.hour === time.hour && t.minute === time.minute);
  };

  const addTime = () => {
    if (timeExists(newTime)) return;

    const updated = sortTimes([...selectedTimes, newTime]);
    setSelectedTimes(updated);
    onChange?.(updated);
  };

  const removeTime = (timeToRemove: PostingTime) => {
    const updated = selectedTimes.filter(
      t => !(t.hour === timeToRemove.hour && t.minute === timeToRemove.minute)
    );
    setSelectedTimes(updated);
    onChange?.(updated);
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    const updated = sortTimes(preset.times);
    setSelectedTimes(updated);
    onChange?.(updated);
  };

  const clearAll = () => {
    setSelectedTimes([]);
    onChange?.([]);
  };

  const switchToCustom = () => {
    setMode('custom');
  };

  const switchToPresets = () => {
    if (selectedTimes.length > 0) {
      // Show warning but allow the switch
      setMode('presets');
    } else {
      setMode('presets');
    }
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
        <h3 className="text-lg font-semibold">Posting Times</h3>
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
            onClick={switchToPresets}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'presets' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Quick Presets
          </button>
          <button
            onClick={switchToCustom}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'custom' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Custom Times
          </button>
        </div>

        {/* Warning when switching modes */}
        {mode === 'presets' && selectedTimes.length > 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> Selecting a preset will replace your current custom times.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Presets Mode */}
      {mode === 'presets' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => applyPreset(preset)}
                className="p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="font-medium text-sm">{preset.label}</div>
                <div className="text-xs text-gray-500">
                  {preset.times.slice(0, 4).map(formatTime).join(', ')}
                  {preset.times.length > 4 && ` +${preset.times.length - 4} more`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Mode */}
      {mode === 'custom' && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Add Time</h4>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <TimeInput
                value={newTime}
                onChange={setNewTime}
              />
            </div>
            <button
              onClick={addTime}
              disabled={timeExists(newTime)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Time
            </button>
          </div>
          {timeExists(newTime) && (
            <p className="text-xs text-red-600 mt-2">This time is already selected</p>
          )}
        </div>
      )}

      {/* Selected Times List */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            Selected Times ({selectedTimes.length})
          </h4>
          {selectedTimes.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          )}
        </div>
        
        {selectedTimes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {selectedTimes.map((time, index) => (
              <div
                key={`${time.hour}-${time.minute}`}
                className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-blue-900">
                    {formatTime(time)}
                  </span>
                  <span className="text-xs text-blue-600">
                    {formatTime24(time)}
                  </span>
                </div>
                <button
                  onClick={() => removeTime(time)}
                  className="text-blue-600 hover:text-red-600 transition-colors"
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
            <p className="text-sm">No posting times selected</p>
            <p className="text-xs">Choose a preset or add custom times</p>
          </div>
        )}
      </div>

      <PostingSummary times={selectedTimes} />
    </div>
  );
}
