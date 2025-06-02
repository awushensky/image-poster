import React, { useState } from 'react';
import { Clock, Plus, Pause, X, Globe, Play } from 'lucide-react';
import type { CronSchedule, ProposedCronSchedule, User } from '~/model/model';
import { cronToDescription, getNextExecutions, timeToCron } from '~/lib/cron-utils';
import { commonTimezones } from '~/lib/time-utils';


interface ScheduleEditorProps {
  user: User;
  schedules: CronSchedule[];
  onAddSchedule: (scheduleToAdd: ProposedCronSchedule) => void;
  onToggleSchedule: (id: number, active: boolean) => void;
  onDeleteSchedule: (id: number) => void;
  onTimezoneChange: (timezone: string) => void;
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  user,
  schedules,
  onAddSchedule,
  onToggleSchedule,
  onDeleteSchedule,
  onTimezoneChange
}) => {
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Monday-Friday
  const [showTimezoneSelector, setShowTimezoneSelector] = useState(false);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const colorClasses = {
    blue: 'bg-cyan-400 text-white',
    green: 'bg-amber-400 text-white', 
    purple: 'bg-purple-400 text-white',
    orange: 'bg-orange-400 text-white',
    red: 'bg-red-400 text-white',
    indigo: 'bg-indigo-400 text-white'
  };
  
  const disabledColorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-400',
    green: 'bg-green-50 border-green-200 text-green-400', 
    purple: 'bg-purple-50 border-purple-200 text-purple-400',
    orange: 'bg-orange-50 border-orange-200 text-orange-400',
    red: 'bg-red-50 border-red-200 text-red-400',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-400'
  };

  const getRandomColor = (): CronSchedule['color'] => {
    const colors: CronSchedule['color'][] = ['blue', 'green', 'purple', 'orange', 'red', 'indigo'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleAddSchedule = () => {
    if (selectedDays.length === 0) return;

    const cronExpression = timeToCron(selectedHour, selectedMinute, selectedDays);

    onAddSchedule({
      cron_expression: cronExpression,
      color: getRandomColor(),
      active: true
    });
  };

  const activeSchedules = schedules.filter(s => s.active);
  const nextExecutions = activeSchedules.length > 0 
    ? getNextExecutions(activeSchedules[0].cron_expression, user.timezone, 3)
    : [];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Posting Schedule</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Globe className="w-4 h-4" />
              <span>{user.timezone}</span>
              <button 
                onClick={() => setShowTimezoneSelector(!showTimezoneSelector)}
                className="text-blue-600 hover:text-blue-800"
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
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Timezone</label>
          <select 
            value={user.timezone}
            onChange={(e) => {
              onTimezoneChange(e.target.value);
              setShowTimezoneSelector(false);
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            {commonTimezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      )}

      {/* Add Schedule Section */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {Array.from({length: 24}, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
              <select 
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {[0, 15, 30, 45].map(minute => (
                  <option key={minute} value={minute}>{minute.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
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
          <div className="flex items-end">
            <button 
              onClick={handleAddSchedule}
              disabled={selectedDays.length === 0}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Add Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Active Schedules */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900">
          Active Schedules ({schedules.length})
        </h3>
        
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No schedules created yet. Add your first schedule above.
          </div>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`border rounded-lg p-4 ${schedule.active ? colorClasses[schedule.color] : disabledColorClasses[schedule.color]}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{cronToDescription(schedule.cron_expression)}</span>
                  <p className="text-sm mt-1 opacity-75">
                    Cron: {schedule.cron_expression}
                  </p>
                </div>
                <div className="flex flex-col">
                  { schedule.active &&
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                      Active
                    </div>
                  }
                  { !schedule.active &&
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500 text-white">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></div>
                      Paused
                    </div>
                  }
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onToggleSchedule(schedule.id, !schedule.active)}
                      className={`p-1 hover:scale-110 transition-transform ${
                        schedule.active ? 'text-current' : 'text-gray-400'
                      }`}
                      title={schedule.active ? 'Pause schedule' : 'Resume schedule'}
                    >
                      {schedule.active ? 
                        <Pause className="w-4 h-4" /> : 
                        <Play className="w-4 h-4" />
                      }
                    </button>
                    <button 
                      onClick={() => onDeleteSchedule(schedule.id)}
                      className="p-1 hover:text-red-600 hover:scale-110 transition-all"
                      title="Delete schedule"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Next Postings */}
      {nextExecutions.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Next 3 Postings:</h4>
          <div className="space-y-1 text-sm text-gray-600">
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
