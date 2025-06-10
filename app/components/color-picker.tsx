import { Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COLORS, type ColorType } from "~/lib/color-utils";

interface ColorPickerProps {
  currentColor: ColorType;
  active: boolean;
  onColorChange: (color: ColorType) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ currentColor, active, onColorChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleColorSelect = (color: ColorType) => {
    onColorChange(color);
    setIsOpen(false);
  };

  const getButtonColor = (): string => {
    return active ? `text-${currentColor}-600 dark:text-${currentColor}-400 hover:text-gray-600 dark:hover:text-gray-400` : `text-gray-400 dark:text-gray-500 hover:text-${currentColor}-900 dark:hover:text-${currentColor}-300`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 relative ${getButtonColor()}`}
        title="Change color"
      >
        <Palette className="w-4 h-4" />
        {/* <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white bg-${currentColor}-500`} /> */}
      </button>
      
      {isOpen && (
        <div className="absolute top-8 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <div className="grid grid-cols-4 gap-2 w-32">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 bg-${color}-500 ${
                  currentColor === color 
                    ? 'border-gray-800 dark:border-gray-200 ring-2 ring-gray-300 dark:ring-gray-600' 
                    : 'border-white dark:border-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                title={`Change to ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
