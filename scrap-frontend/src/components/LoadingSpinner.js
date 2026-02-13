/* src/components/LoadingSpinner.js */
import React from "react";
import { colors } from "../styles/designSystem";

const LoadingSpinner = ({ size = "md", message }) => {
  const sizes = {
    sm: { width: 24, height: 24, border: '2px' },
    md: { width: 40, height: 40, border: '3px' },
    lg: { width: 60, height: 60, border: '4px' },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      gap: "12px", 
      width: "100%", 
      minHeight: "100px" 
    }}>
      <style>{`
        @keyframes spinStandard {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeInText {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div style={{
        width: currentSize.width,
        height: currentSize.height,
        borderRadius: "50%",
        borderWidth: currentSize.border,
        borderStyle: "solid",
        borderColor: colors.gray200,
        borderTopColor: colors.primary,
        backgroundColor: "transparent",
        animation: "spinStandard 0.8s linear infinite",
        boxSizing: "border-box",
        boxShadow: "none",
        transform: "translateZ(0)"
      }} />
      
      {message && (
        <div style={{ 
          color: colors.gray600, 
          fontSize: "0.875rem",
          fontWeight: 500,
          animation: "fadeInText 0.5s ease-in",
          textAlign: "center"
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;