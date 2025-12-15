/* src/components/PageWrapper.js */
import React from "react";

const PageWrapper = ({ children, animationDelay = 0, style }) => {
  // Ya no inyectamos estilos aquí, se hace en App.js globalmente

  return (
    <div
      style={{
        animation: `pageEntry 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay}ms both`,
        width: "100%",
        height: "100%",
        ...style
      }}
    >
      {children}
    </div>
  );
};

export default PageWrapper;