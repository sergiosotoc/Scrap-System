/* src/components/TabsAnimated.js */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { colors, spacing, typography, radius } from "../styles/designSystem";

const TabsAnimated = ({ tabs, defaultTab, onChange, containerStyle }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || (tabs.length > 0 ? tabs[0].id : null));
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef({});

  // CORRECCIÓN: Usamos useCallback para estabilizar la función
  const updateIndicator = useCallback(() => {
    const currentTabId = activeTab;
    if (currentTabId && tabsRef.current[currentTabId]) {
      const activeButton = tabsRef.current[currentTabId];
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  }, [activeTab]);

  // CORRECCIÓN: El efecto solo depende de activeTab y tabs
  useEffect(() => {
    updateIndicator();
    // Agregamos un listener para recalcular si la ventana cambia de tamaño
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (onChange) onChange(tabId);
  };

  if (!tabs || tabs.length === 0) return null;

  return (
    <div style={{ width: "100%", ...containerStyle }}>
      <div
        style={{
          display: "flex",
          gap: spacing.sm,
          borderBottom: `2px solid ${colors.gray200}`,
          position: "relative",
          marginBottom: spacing.lg,
        }}
      >
        {/* Indicador animado */}
        <div
          style={{
            position: "absolute",
            bottom: "-2px",
            height: "3px",
            backgroundColor: colors.primary,
            borderRadius: "3px 3px 0 0",
            transition: "all 350ms cubic-bezier(0.4, 0, 0.2, 1)",
            ...indicatorStyle,
          }}
        />

        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => (tabsRef.current[tab.id] = el)}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: "transparent",
              border: "none",
              color: activeTab === tab.id ? colors.primary : colors.gray600,
              fontSize: typography.sizes.base,
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: "pointer",
              transition: "color 250ms ease",
              outline: "none",
              position: "relative",
              zIndex: 1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido con fade */}
      <div key={activeTab} style={{ animation: "tabFadeIn 0.3s ease-out" }}>
         <style>{`@keyframes tabFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
};

export default TabsAnimated;