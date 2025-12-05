/* src/components/SmoothButton.js */
import React from "react";
import { baseComponents, colors } from "../styles/designSystem";
import { useHoverEffect } from "../hooks/useHoverEffect";

const SmoothButton = ({
  onClick,
  disabled = false,
  children,
  variant = "primary", // primary, secondary, destructive
  style,
  className,
  type = "button",
  title,
  form
}) => {
  // 1. Hook para físicas suaves
  const { isHovered, style: hoverPhysics, handlers } = useHoverEffect({
    scale: disabled ? 1 : 1.02,
    y: disabled ? 0 : -1,
    duration: 200,
  });

  // 2. Seleccionar el estilo base
  let baseStyleObject = baseComponents.buttonPrimary;
  if (variant === 'secondary') baseStyleObject = baseComponents.buttonSecondary;
  if (variant === 'destructive') baseStyleObject = baseComponents.buttonDestructive;

  // 3. Separar pseudo-estados
  const { ':hover': hoverStyles, ':disabled': disabledStyles, ...coreStyles } = baseStyleObject;

  // --- FUNCIÓN DE LIMPIEZA DE BORDES (Helper local) ---
  // Convierte 'border' shorthand en propiedades explícitas para evitar conflictos en React
  const decomposeBorder = (stylesObj) => {
    if (stylesObj.border) {
      const borderVal = stylesObj.border;
      delete stylesObj.border; // Borramos el shorthand

      if (borderVal === 'none') {
        stylesObj.borderWidth = '0px';
        stylesObj.borderStyle = 'none';
        // Importante: No definir borderColor si es none para evitar overrides fantasmas
      } else {
        // Asumimos formato estándar simple. Si es muy complejo, mejor usar clases CSS.
        stylesObj.borderWidth = '1px';
        stylesObj.borderStyle = 'solid';
        // Intentar extraer color (ej: "1px solid #ccc")
        const parts = borderVal.split(' ');
        if (parts.length >= 3) {
           stylesObj.borderColor = parts[parts.length - 1]; // Asumimos color al final
        } else {
           stylesObj.borderColor = colors.gray300; // Fallback
        }
      }
    }
  };

  // 4. Calcular estilos dinámicos BASE
  let activeStyles = { ...coreStyles };
  decomposeBorder(activeStyles); // Limpiamos estilos base

  // Aplicar estados
  if (disabled && disabledStyles) {
    const dStyles = { ...disabledStyles };
    decomposeBorder(dStyles); // Limpiamos estilos disabled
    activeStyles = { ...activeStyles, ...dStyles };
  } else if (isHovered && hoverStyles) {
    const hStyles = { ...hoverStyles };
    // En hover a veces solo cambiamos borderColor, no border completo, así que no siempre hay decompose
    activeStyles = { ...activeStyles, ...hStyles };
  }

  // 5. Procesar estilos MANUALES (props)
  // Aquí es donde ocurría el error: si pasabas style={{border: 'none'}}, chocaba.
  const manualStyles = { ...style };
  
  // Sanitizar background shorthand
  if (manualStyles.background) {
      manualStyles.backgroundColor = manualStyles.background;
      delete manualStyles.background;
  }
  
  // Sanitizar border shorthand en props manuales
  decomposeBorder(manualStyles);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      form={form}
      style={{
        // A. Estilos base ya sanitizados
        ...activeStyles,
        
        // B. Estilos de física
        ...hoverPhysics,
        
        // C. Estilos manuales ya sanitizados
        ...manualStyles,
      }}
      className={className}
      {...handlers}
    >
      {children}
    </button>
  );
};

export default SmoothButton;