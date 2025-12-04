/* src/components/PageWrapper.js */
import React, { useEffect } from "react";

const PageWrapper = ({ children, animationDelay = 0, style }) => {
  useEffect(() => {
    // Inyectar estilos de animación si no existen
    if (!document.getElementById('page-transitions-css')) {
      const styleElement = document.createElement("style");
      styleElement.id = 'page-transitions-css';
      styleElement.innerHTML = `
        @keyframes pageEntry {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(styleElement);
    }
  }, []);

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