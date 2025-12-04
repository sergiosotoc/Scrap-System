/* src/styles/animations.js */
export const keyframes = {
  spinnerRotate: `
    @keyframes spinnerRotate {
      to { transform: rotate(360deg); }
    }
  `,
  spinnerPulse: `
    @keyframes spinnerPulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
  `,
  pageEntry: `
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
  `,
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  slideInUp: `
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `
};

// Función utilitaria para inyectar estilos si no existen
export const injectGlobalStyles = () => {
  if (typeof document === 'undefined') return;
  
  const styleId = 'global-animations-css';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement("style");
    styleElement.id = styleId;
    styleElement.innerHTML = Object.values(keyframes).join('\n');
    document.head.appendChild(styleElement);
  }
};