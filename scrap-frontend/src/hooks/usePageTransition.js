/* src/hooks/usePageTransition.ts */
import { useEffect, useState } from "react";

export const usePageTransition = (duration = 500) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(true);

  useEffect(() => {
    setDisplayChildren(true);
    setIsTransitioning(false);
  }, []);

  return {
    isTransitioning,
    displayChildren,
    startTransition: (callback) => {
      setIsTransitioning(true);
      setTimeout(() => {
        setDisplayChildren(false);
        callback?.();
        setTimeout(() => {
          setDisplayChildren(true);
          setIsTransitioning(false);
        }, 50);
      }, duration / 2);
    },
  };
};