interface TimeInputProps {
  value: { hour: number; minute: number };
  onChange: (time: { hour: number; minute: number }) => void;
}

export function TimeInput({ value, onChange }: TimeInputProps) {

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
      <div className="grid grid-cols-2 gap-2">
        <select 
          value={value.hour}
          onChange={(e) => onChange({ hour: parseInt(e.target.value), minute: value.minute })}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          {Array.from({length: 24}, (_, i) => (
            <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
          ))}
        </select>
        <select 
          value={value.minute}
          onChange={(e) => onChange({ hour: value.hour, minute: parseInt(e.target.value) })}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          {[0, 15, 30, 45].map(minute => (
            <option key={minute} value={minute}>{minute.toString().padStart(2, '0')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
