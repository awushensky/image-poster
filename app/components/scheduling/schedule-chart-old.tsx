import type { PostingTime } from "~/model/model";


interface ScheduleChartProps {
  schedule: PostingTime[];
}

const ScheduleChart: React.FC<ScheduleChartProps> = ({ schedule }) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const formatTime = (hour: number, minute: number): string => {
    const displayHour = hour.toString().padStart(2, '0');
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute}`;
  };

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
                {dayNames[dayNum].slice(0, 3)}
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
          
          {/* Chart plotting area */}
          <div className="relative h-32">
            {schedule.map((time, index) => {
              const xPosition = ((time.hour + time.minute / 60) / 24) * 100;
              const yPosition = ((6 - time.day_of_week) / 7) * 100 + (100 / 14); // Center in row
              
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
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full border border-white shadow-sm hover:bg-blue-700 hover:scale-125 transition-all cursor-pointer" />
                  {/* Tooltip */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {dayNames[time.day_of_week]} {formatTime(time.hour, time.minute)}
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
