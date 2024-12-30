"use client";

import React, { useState } from "react";

const DelayedTooltip = ({
  content,
  children,
  delay = 1000, // Delay in milliseconds
  maxLength = 500, // Maximum tooltip length
}: {
  content: string;
  children: React.ReactNode;
  delay?: number;
  maxLength?: number;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const truncatedContent =
    content.length > maxLength
      ? content.slice(0, maxLength) + "..."
      : content;

  const handleMouseEnter = () => {
    const hoverTimer = setTimeout(() => {
      setShowTooltip(true);
    }, delay);
    setTimer(hoverTimer);
  };

  const handleMouseLeave = () => {
    if (timer) {
      clearTimeout(timer);
    }
    setShowTooltip(false);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {showTooltip && (
        <div
          className="absolute z-50 bg-gray-800 text-white text-sm p-4 rounded shadow-lg"
          style={{
            minWidth: "20vw", // Wider tooltip width
            whiteSpace: "normal", // Allow text wrapping
            wordWrap: "break-word", // Prevent overflow
            left: "50%", // Center tooltip horizontally
            transform: "translateX(-50%)", // Center alignment fix
          }}
        >
          {truncatedContent}
        </div>
      )}
    </div>
  );
};

export default DelayedTooltip;