import React, { useState } from "react";
import { colors, radius, spacing, typography } from "../styles/designSystem";

const SmoothSelect = ({
  label,
  value,
  onChange,
  children,
  style,
  name,
  required,
  disabled
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      {label && (
        <label
          style={{
            fontSize: typography.sizes.xs,
            fontWeight: 700,
            color: isFocused ? colors.primary : colors.gray600,
            transition: "all 200ms ease",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginLeft: "2px",
          }}
        >
          {label} {required && <span style={{ color: colors.error }}>*</span>}
        </label>
      )}
      <div style={{ position: "relative", width: "100%" }}>
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="smooth-select-reset" /* Aplica el fix de CSS global */
          style={{
            width: "100%",
            height: "42px",
            padding: "0 40px 0 16px", // Espacio para la flecha
            border: `1.5px solid ${isFocused ? colors.primary : colors.gray300}`,
            borderRadius: radius.md,
            fontSize: typography.sizes.sm,
            fontFamily: typography.fontFamily,
            backgroundColor: disabled ? colors.gray100 : colors.surface,
            color: colors.gray800,
            outline: "none",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isFocused ? `0 0 0 4px ${colors.primary}15` : "none",
            cursor: disabled ? "not-allowed" : "pointer",
            
            // --- PROPIEDADES CRÍTICAS PARA EDGE/CHROME/FIREFOX ---
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            
            // --- FLECHA SVG PERSONALIZADA (Base64) ---
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            backgroundSize: "16px",
            
            ...style,
          }}
        >
          {children}
        </select>
      </div>
    </div>
  );
};

export default SmoothSelect;