import React, { useState } from 'react';
import { Clock, Plus, X, Globe, PauseCircle, PlayCircle } from 'lucide-react';
import type { ProposedPostingSchedule } from "~/model/posting-schedules";
import { cronToDays, cronToDescription, getNextExecutionsForMultipleSchedules, timeToCron } from '~/lib/cron-utils';
import { commonTimezones, DAY_NAMES } from '~/lib/time-utils';
import { DaysOfWeekInput } from './days-of-week-input';
import { TimeInput } from './time-input';
import { COLORS, type ColorType } from '~/lib/color-utils';
import { ColorPicker } from '../color-picker';

interface ScheduleEditorProps {
  timezone: string;
  schedules: ProposedPostingSchedule[];
  onAddSchedule: (scheduleToAdd: ProposedPostingSchedule) => void;
  onToggleSchedule: (index: number, active: boolean) => void;
  onDeleteSchedule: (index: number) => void;
  onColorChange: (index: number, color: ColorType) => void;
  onTimezoneChange: (timezone: string) => void;
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  timezone,
  schedules,
  onAddSchedule,
  onToggleSchedule,
  onDeleteSchedule,
  onColorChange,
  onTimezoneChange,
}) => {
  const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number }>({ hour: 9, minute: 0 });
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [nextColor, setNextColor] = useState<number>(0);
  const [showTimezoneSelector, setShowTimezoneSelector] = useState(false);

  function getCardColor(color: ColorType, active: boolean): string {
    return active ? `bg-${color}-50 dark:bg-${color}-900/20 border-${color}-200 dark:border-${color}-800` : `bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600`;
  }

  function getLargeTextColor(color: ColorType, active: boolean): string {
    return active ? `text-${color}-900 dark:text-${color}-100` : 'text-gray-400 dark:text-gray-500';
  }

  function getSmallTextColor(color: ColorType, active: boolean): string {
    return active ? `text-${color}-600 dark:text-${color}-300` : 'text-gray-400 dark:text-gray-500';
  }

  function getPauseButtonColor(color: ColorType, active: boolean): string {
    return active ? `text-${color}-600 dark:text-${color}-400 hover:text-gray-600 dark:hover:text-gray-400` : `text-gray-400 dark:text-gray-500 hover:text-${color}-900 dark:hover:text-${color}-300`;
  }

  function getCloseButtonColor(color: ColorType, active: boolean): string {
    return active ? `text-${color}-600 dark:text-${color}-400 hover:text-red-600 dark:hover:text-red-400` : `text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400`;
  }

  const getNextColor = (): ColorType => {
    const color = COLORS[nextColor];
    const newNextColor = nextColor + 1 >= COLORS.length ? 0 : nextColor + 1;
    setNextColor(newNextColor);

    return color;
  };

  const handleAddSchedule = () => {
    if (selectedDays.length === 0) return;

    const cronExpression = timeToCron(selectedTime.hour, selectedTime.minute, selectedDays);

    onAddSchedule({
      cronExpression: cronExpression,
      color: getNextColor(),
      active: true
    });
  };

  const activeSchedules = schedules.filter(s => s.active);
  const nextExecutions = getNextExecutionsForMultipleSchedules(activeSchedules.map(s => s.cronExpression), timezone, 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Posting Schedule</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Globe className="w-4 h-4" />
              <span>{timezone}</span>
              <button 
                onClick={() => setShowTimezoneSelector(!showTimezoneSelector)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Change
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Timezone Selector */}
      {showTimezoneSelector && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Timezone</label>
          <select 
            value={timezone}
            onChange={(e) => {
              onTimezoneChange(e.target.value);
              setShowTimezoneSelector(false);
            }}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {commonTimezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      )}

      {/* Add Schedule Section */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TimeInput
            value={selectedTime}
            onChange={setSelectedTime}
          />
          <DaysOfWeekInput
            title="Days"
            selectedDays={selectedDays}
            onChange={setSelectedDays}
          />
          <div className="flex items-end">
            <button 
              onClick={handleAddSchedule}
              disabled={selectedDays.length === 0}
              className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Add Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Schedules */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Schedules ({schedules.length})
        </h3>
        
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No schedules created yet. Add your first schedule above.
          </div>
        ) : (
          schedules.map((schedule, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getCardColor(schedule.color, schedule.active)}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`font-medium ${getLargeTextColor(schedule.color, schedule.active)}`}>
                    {cronToDescription(schedule.cronExpression)}
                  </span>
                  <p className={`text-sm mt-1 ${getSmallTextColor(schedule.color, schedule.active)}`}>
                    {cronToDays(schedule.cronExpression).map(day => DAY_NAMES[day]).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ColorPicker
                    currentColor={schedule.color}
                    active={schedule.active}
                    onColorChange={(color) => onColorChange(index, color)}
                  />
                  
                  <button 
                    onClick={() => onToggleSchedule(index, !schedule.active)}
                    className={`p-1 ${getPauseButtonColor(schedule.color, schedule.active)}`}
                    title={schedule.active ? 'Pause schedule' : 'Resume schedule'}
                  >
                    {schedule.active ? 
                      <PauseCircle className="w-4 h-4" /> :
                      <PlayCircle className="w-4 h-4" />
                    }
                  </button>
                  <button 
                    onClick={() => onDeleteSchedule(index)}
                    className={`p-1 ${getCloseButtonColor(schedule.color, schedule.active)}`}
                    title="Delete schedule"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Next Postings */}
      {nextExecutions.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Next 3 Postings:</h4>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {nextExecutions.map((date, index) => (
              <div key={index}>
                {date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })} at {date.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleEditor;
