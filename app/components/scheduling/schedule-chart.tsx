import React, { useState, useEffect } from 'react';
import type { ProposedPostingSchedule } from "~/model/model";
import { cronToDescription, cronToTime } from "~/lib/cron-utils";
import { DAY_NAMES, formatTime, getCurrentTimeInTimezone as getTimeInTimezone } from '~/lib/time-utils';

interface ScheduleChartProps {
  schedules: ProposedPostingSchedule[];
  timezone: string;
}

interface PostingTime {
  schedule: ProposedPostingSchedule;
  day_of_week: number;
  hour: number;
  minute: number;
}

interface GroupedPostingTimes {
  day_of_week: number;
  hour: number;
  minute: number;
  schedules: ProposedPostingSchedule[];
}

function groupPostingTimes(postingTimes: PostingTime[]): GroupedPostingTimes[] {
  const grouped = postingTimes.reduce((acc, item) => {
    const key = `${item.day_of_week}-${item.hour}-${item.minute}`;
    
    if (!acc.has(key)) {
      acc.set(key, {
        day_of_week: item.day_of_week,
        hour: item.hour,
        minute: item.minute,
        schedules: [item.schedule],
      });
    } else {
      acc.get(key)!.schedules.push(item.schedule);
    }
    
    return acc;
  }, new Map<string, GroupedPostingTimes>());

  return Array.from(grouped.values());
}

const ScheduleChart: React.FC<ScheduleChartProps> = ({ schedules, timezone }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getColorClass = (color: string): string => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-600 hover:bg-blue-700',
      green: 'bg-green-600 hover:bg-green-700',
      purple: 'bg-purple-600 hover:bg-purple-700',
      orange: 'bg-orange-600 hover:bg-orange-700',
      red: 'bg-red-600 hover:bg-red-700',
      indigo: 'bg-indigo-600 hover:bg-indigo-700',
    };
    return colorMap[color] || 'bg-gray-600 hover:bg-gray-700';
  };

  const postingTimes: PostingTime[] = schedules
    .filter(schedule => schedule.active)
    .flatMap(schedule => {
      const postingTime = cronToTime(schedule.cron_expression);
      return postingTime.map(instance => ({
        schedule,
        ...instance
      }));
    });

  const groupedPostingTimes = groupPostingTimes(postingTimes);

  // Calculate current time position in the specified timezone
  const { hours: currentHour, minutes: currentMinute, dayOfWeek: currentDay } = getTimeInTimezone(currentTime, timezone);
  const currentTimePosition = ((currentHour + currentMinute / 60) / 24) * 100;
  const currentDayYPosition = ((6 - currentDay) / 7) * 100;

  return (
    <div className="relative">
      {/* Chart area with grid */}
      <div className="flex">
        {/* Y-axis (Days) */}
        <div className="relative pr-4 w-20 h-32">
          {[0, 1, 2, 3, 4, 5, 6].map(dayNum => {
            const yPosition = ((6 - dayNum) / 7) * 100 + (100 / 14); // Center in row
            return (
              <div 
                key={dayNum} 
                className="absolute text-sm text-gray-700 text-right leading-none"
                style={{ 
                  top: `${yPosition}%`,
                  right: '16px',
                  transform: 'translateY(-50%)'
                }}
              >
                {DAY_NAMES[dayNum].slice(0, 3)}
              </div>
            );
          })}
        </div>
        
        {/* Main chart area */}
        <div className="flex-1 relative border-l-2 border-b-2 border-gray-300 bg-gray-100">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {/* Horizontal grid lines */}
            {[0, 1, 2, 3, 4, 5, 6].map(dayNum => (
              <div
                key={`h-${dayNum}`}
                className="absolute w-full border-t border-gray-200"
                style={{ top: `${(dayNum / 7) * 100}%` }}
              />
            ))}
            
            {/* Vertical grid lines */}
            {[0, 6, 12, 18, 24].map(hour => (
              <div
                key={`v-${hour}`}
                className="absolute h-full border-l border-gray-200"
                style={{ left: `${(hour / 24) * 100}%` }}
              />
            ))}
          </div>

          {/* Current time indicator */}
          <div
            className="absolute border-l-2 border-red-500 z-20"
            style={{ 
              left: `${currentTimePosition}%`,
              top: `${currentDayYPosition}%`,
              height: `${100/7}%` // Height of one day row
            }}
          >
          </div>
          
          {/* Chart plotting area */}
          <div className="relative h-32">
            {groupedPostingTimes.map((group, index) => {
              const xPosition = ((group.hour + group.minute / 60) / 24) * 100;
              const yPosition = ((6 - group.day_of_week) / 7) * 100 + (100 / 14); // Center in row
              
              // For multiple schedules, use the first schedule's color
              const primarySchedule = group.schedules[0];
              const colorClass = getColorClass(primarySchedule.color);
              
              return (
                <div
                  key={index}
                  className="absolute group"
                  style={{ 
                    left: `${xPosition}%`, 
                    top: `${yPosition}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className={`w-2.5 h-2.5 ${colorClass} rounded-full border border-white shadow-sm hover:scale-125 transition-all cursor-pointer relative`}>
                    {group.schedules.length > 1 && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                        {group.schedules.length}
                      </div>
                    )}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 max-w-xs">
                    {group.schedules.length === 1 ? (
                      <>
                        {DAY_NAMES[group.day_of_week]} {formatTime(group.hour, group.minute)}
                      </>
                    ) : (
                      <div className="space-y-1">
                        <div className="font-semibold">
                          {DAY_NAMES[group.day_of_week]} {formatTime(group.hour, group.minute)}
                        </div>
                        <div className="text-xs">
                          {group.schedules.map((schedule, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <div className={`w-2 h-2 ${getColorClass(schedule.color).split(' ')[0]} rounded-full`}></div>
                              <span>{cronToDescription(schedule.cron_expression)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* X-axis (Time) */}
      <div className="flex justify-between mt-2 ml-24 text-xs text-gray-600">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
};

export default ScheduleChart;
