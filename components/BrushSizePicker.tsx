import React, { useState, useRef, useEffect } from "react";

interface BrushSizePickerProps {
  value: number;
  onChange: (size: number) => void;
}

const BrushSizePicker: React.FC<BrushSizePickerProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const sizes: number[] = [1, 2, 4, 8, 12, 16, 24, 32];

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

  const getMenuPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };
  };

  return (
    <div>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 p-0 border border-gray-300 rounded-full flex items-center justify-center"
      >
        <div
          style={{
            width: value,
            height: value,
            borderRadius: "50%",
            backgroundColor: "black",
          }}
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          style={getMenuPosition()}
          className="absolute z-10 bg-white border border-gray-300 rounded shadow-md"
        >
          <div className="flex flex-col p-2">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => {
                  onChange(size);
                  setIsOpen(false);
                }}
                className="p-2 hover:bg-gray-100 rounded flex items-center"
              >
                <div
                  style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    backgroundColor: "black",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrushSizePicker;
