/* src/components/SmoothButton.js */
import React from "react";
import { baseComponents, designSystem } from "../styles/designSystem";
import { useHoverEffect } from "../hooks/useHoverEffect";

const SmoothButton = ({
  onClick,
  disabled = false,
  children,
  variant = "primary", // primary, secondary, destructive
  style,
  className,
  type = "button",
  title
}) => {
  // 1. Hook para físicas suaves (escala y rebote)
  const { isHovered, isPressed, style: hoverPhysics, handlers } = useHoverEffect({
    scale: disabled ? 1 : 1.02,
    y: disabled ? 0 : -1, // Un movimiento sutil hacia arriba
    duration: 200,
  });

  // 2. Seleccionar el estilo base de TU design system
  let baseStyleObject = baseComponents.buttonPrimary;
  
  if (variant === 'secondary') baseStyleObject = baseComponents.buttonSecondary;
  if (variant === 'destructive') baseStyleObject = baseComponents.buttonDestructive;

  // 3. Separar los pseudo-selectores (como :hover) del estilo base
  // React no entiende ':hover' en estilos inline, así que lo gestionamos con estado JS
  const { ':hover': hoverStyles, ':disabled': disabledStyles, ...coreStyles } = baseStyleObject;

  // 4. Calcular estilos dinámicos
  let activeStyles = { ...coreStyles };

  if (disabled && disabledStyles) {
    activeStyles = { ...activeStyles, ...disabledStyles };
  } else if (isHovered && hoverStyles) {
    // Aplicar los colores de hover definidos en tu sistema
    activeStyles = { ...activeStyles, ...hoverStyles };
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        // A. Estilos visuales de tu marca
        ...activeStyles,
        
        // B. Estilos de física (transform, transition)
        ...hoverPhysics,
        
        // C. Sobreescrituras manuales
        ...style,
      }}
      className={className}
      {...handlers}
    >
      {children}
    </button>
  );
};

export default SmoothButton;