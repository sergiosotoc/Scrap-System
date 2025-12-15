/* src/components/SmoothInput.js */
import React, { useState } from "react";
import { baseComponents, colors, spacing, typography } from "../styles/designSystem";

const SmoothInput = ({
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  label,
  error,
  style,
  rightElement,
  required = false,
  name,
  ...props // Capturamos props adicionales (como list, autoComplete, etc.)
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const { ':focus': focusStyles, ...baseInputStyles } = baseComponents.input;

  const currentInputStyles = {
    ...baseInputStyles,
    width: "100%",
    borderColor: error ? colors.error : (isFocused ? colors.primary : baseInputStyles.borderColor),
    boxShadow: isFocused && !error ? focusStyles.boxShadow : (error ? 'none' : 'none'),
    backgroundColor: disabled ? colors.gray100 : baseInputStyles.backgroundColor,
    opacity: disabled ? 0.7 : 1,
    paddingRight: rightElement ? spacing.xl : baseInputStyles.paddingRight || spacing.sm,
    ...style
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs, width: "100%" }}>
      {label && (
        <label
          style={{
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.medium,
            color: error ? colors.error : (isFocused ? colors.primary : colors.gray700),
            transition: "color 0.2s ease",
            marginLeft: '1px'
          }}
        >
          {label} {required && <span style={{ color: colors.error }}>*</span>}
        </label>
      )}
      
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={(e) => { setIsFocused(true); if(props.onFocus) props.onFocus(e); }}
          onBlur={(e) => { setIsFocused(false); if(props.onBlur) props.onBlur(e); }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={currentInputStyles}
          {...props} // Pasamos las props adicionales al input nativo
        />
        
        {rightElement && (
          <div style={{ position: "absolute", right: spacing.sm, display: "flex", alignItems: "center", color: colors.gray500 }}>
            {rightElement}
          </div>
        )}
      </div>
      
      {error && (
        <span
          style={{
            fontSize: typography.sizes.xs,
            color: colors.error,
            animation: "slideInUp 0.3s ease-out",
          }}
        >
          {error}
        </span>
      )}
      <style>{`
        @keyframes slideInUp { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default SmoothInput;