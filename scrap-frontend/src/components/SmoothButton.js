/* src/components/SmoothButton.js */
import React from "react";
import { baseComponents, colors } from "../styles/designSystem";
import { useHoverEffect } from "../hooks/useHoverEffect";

const SmoothButton = ({
  onClick,
  disabled = false,
  children,
  variant = "primary",
  style,
  className,
  type = "button",
  title,
  form
}) => {
  const { isHovered, style: hoverPhysics, handlers } = useHoverEffect({
    scale: disabled ? 1 : 1.02,
    y: disabled ? 0 : -1,
    duration: 200,
  });

  let baseStyleObject = baseComponents.buttonPrimary;
  if (variant === 'secondary') baseStyleObject = baseComponents.buttonSecondary;
  if (variant === 'destructive') baseStyleObject = baseComponents.buttonDestructive;

  const { ':hover': hoverStyles, ':disabled': disabledStyles, ...coreStyles } = baseStyleObject;

  const decomposeBorder = (stylesObj) => {
    if (stylesObj.border) {
      const borderVal = stylesObj.border;
      delete stylesObj.border;

      if (borderVal === 'none') {
        stylesObj.borderWidth = '0px';
        stylesObj.borderStyle = 'none';
      } else {
        stylesObj.borderWidth = '1px';
        stylesObj.borderStyle = 'solid';
        const parts = borderVal.split(' ');
        if (parts.length >= 3) {
           stylesObj.borderColor = parts[parts.length - 1]; 
        } else {
           stylesObj.borderColor = colors.gray300; 
        }
      }
    }
  };

  let activeStyles = { ...coreStyles };
  decomposeBorder(activeStyles); 

  if (disabled && disabledStyles) {
    const dStyles = { ...disabledStyles };
    decomposeBorder(dStyles); 
    activeStyles = { ...activeStyles, ...dStyles };
  } else if (isHovered && hoverStyles) {
    const hStyles = { ...hoverStyles };
    activeStyles = { ...activeStyles, ...hStyles };
  }

  const manualStyles = { ...style };
  
  if (manualStyles.background) {
      manualStyles.backgroundColor = manualStyles.background;
      delete manualStyles.background;
  }
  
  decomposeBorder(manualStyles);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      form={form}
      style={{
        ...activeStyles,
        
        ...hoverPhysics,
        
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