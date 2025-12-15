/* src/hooks/useHoverEffect.js */
import { useState, useRef } from "react";

export const useHoverEffect = (options = {}) => {
  const { scale = 1.02, y = -4, duration = 200 } = options;
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const getTransform = () => {
    if (isPressed) return `scale(0.98)`;
    if (isHovered) return `scale(${scale}) translateY(${y}px)`;
    return `scale(1) translateY(0)`;
  };

  return {
    isHovered,
    isPressed,
    style: {
      transform: getTransform(),
      transition: `all ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
      cursor: "pointer",
    },
    handlers: {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => {
        setIsHovered(false);
        setIsPressed(false);
      },
      onMouseDown: () => setIsPressed(true),
      onMouseUp: () => setIsPressed(false),
    },
  };
};