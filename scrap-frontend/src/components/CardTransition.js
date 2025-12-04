/* src/components/CardTransition.js */
import React from "react";
import { useInViewAnimation } from "../hooks/useInViewAnimation";

const CardTransition = ({ children, delay = 0, style, className }) => {
  const { ref, isInView } = useInViewAnimation(0.1);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`,
        willChange: "opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default CardTransition;