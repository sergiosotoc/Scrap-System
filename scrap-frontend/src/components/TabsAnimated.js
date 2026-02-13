/* src/components/TabsAnimated.js */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { colors, spacing, typography, radius } from "../styles/designSystem";

const TabsAnimated = ({ tabs, defaultTab, onChange, containerStyle }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || (tabs.length > 0 ? tabs[0].id : null));
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [hoveredTab, setHoveredTab] = useState(null);
  const tabsRef = useRef({});

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

  useEffect(() => {
    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);
    return () => {
        window.removeEventListener('resize', updateIndicator);
        clearTimeout(timer);
    };
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
        <div
          style={{
            position: "absolute",
            bottom: "-2px",
            height: "3px",
            backgroundColor: colors.primary,
            borderRadius: "3px 3px 0 0",
            transition: "all 350ms cubic-bezier(0.4, 0, 0.2, 1)",
            ...indicatorStyle,
            zIndex: 10
          }}
        />

        {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isHovered = hoveredTab === tab.id;

            return (
              <button
                key={tab.id}
                ref={(el) => (tabsRef.current[tab.id] = el)}
                onClick={() => handleTabChange(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: "transparent",
                  border: "none",
                  color: isActive 
                    ? colors.primary 
                    : (isHovered ? colors.gray800 : colors.gray500),
                  
                  background: isHovered && !isActive 
                    ? colors.gray100 
                    : 'transparent',
                    
                  fontSize: typography.sizes.base,
                  fontWeight: isActive ? 700 : (isHovered ? 600 : 500),
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  outline: "none",
                  position: "relative",
                  zIndex: 1,
                  borderRadius: `${radius.md} ${radius.md} 0 0`,
                  transform: isHovered && !isActive ? 'translateY(-1px)' : 'none'
                }}
              >
                {tab.label}
              </button>
            );
        })}
      </div>

      <div key={activeTab} style={{ animation: "tabFadeIn 0.3s ease-out" }}>
         <style>{`@keyframes tabFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
};

export default TabsAnimated;