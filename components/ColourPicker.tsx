import React, { useState, useRef, useEffect } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null); // Add ref for the button

  const colors: string[] = [
    "#FFFFFF", // White
    "#D3D3D3", // Light Gray
    "#808080", // Gray
    "#000000", // Black
    "#E91E63", // Redish Pink
    "#F44336", // Red
    "#FF9800", // Orange
    "#FFEB3B", // Yellow
    "#CDDC39", // Lime
    "#4CAF50", // Green
    "#009688", // Teal
    "#00BCD4", // Cyan
    "#1E90FF", // Dodger Blue (Distinct Light Blue)
    "#0000FF", // Blue (Pure Blue)
    "#673AB7", // Deep Purple
    "#9C27B0", // Purple
  ];

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const calculateColumns = () => {
    const colorCount = colors.length;
    return Math.ceil(Math.sqrt(colorCount));
  };

  const getMenuPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };
  };

  return (
    <div className="flex flex-col items-center">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: value }}
        className="w-8 h-8 border border-gray-300 rounded-full"
      />

      {isOpen && (
        <div
          ref={menuRef}
          style={getMenuPosition()}
          className="absolute z-10 bg-white border border-gray-300 rounded shadow-md"
        >
          <div className={`grid grid-cols-4 gap-2 p-2`}>
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                style={{ backgroundColor: color }}
                className="w-8 h-8 rounded-full"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
