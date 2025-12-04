/* src/components/TabsAnimated.js */
import React, { useState, useRef, useEffect } from "react";
import { colors, spacing, typography } from "../styles/designSystem";

const TabsAnimated = ({ tabs, defaultTab, onChange, containerStyle }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || (tabs.length > 0 ? tabs[0].id : null));
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef({});

  useEffect(() => {
    if (activeTab && tabsRef.current[activeTab]) {
      const activeButton = tabsRef.current[activeTab];
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  }, [activeTab, tabs]);

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
            height: "2px",
            backgroundColor: colors.primary,
            transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            ...indicatorStyle,
          }}
        />

        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => (tabsRef.current[tab.id] = el)}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: `${spacing.sm} ${spacing.base}`,
              backgroundColor: "transparent",
              border: "none",
              color: activeTab === tab.id ? colors.primary : colors.gray500,
              fontSize: typography.sizes.sm,
              fontWeight: activeTab === tab.id ? typography.weights.semibold : typography.weights.medium,
              cursor: "pointer",
              transition: "color 200ms ease",
              outline: "none",
              position: "relative",
              zIndex: 1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div key={activeTab} style={{ animation: "tabFadeIn 0.3s ease-out" }}>
         <style>{`@keyframes tabFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
};

export default TabsAnimated;