/**
 * Hook for managing minimap UI state
 *
 * Handles visibility toggle, mobile detection, drag state, and localStorage persistence
 */

import { useState, useEffect, useCallback } from "react";

/** LocalStorage key for minimap visibility preference */
const STORAGE_KEY = "minimap:visibility";

/** Mobile breakpoint in pixels */
const MOBILE_BREAKPOINT = 768;

interface UseMinimapStateReturn {
  /** Whether minimap is currently visible */
  isVisible: boolean;
  /** Whether user is currently dragging viewport */
  isDragging: boolean;
  /** Whether device is mobile (<768px) */
  isMobile: boolean;
  /** Set dragging state */
  setIsDragging: (isDragging: boolean) => void;
  /** Toggle minimap visibility */
  toggleVisibility: () => void;
}

/**
 * Custom hook for minimap state management
 *
 * Features:
 * - Persists visibility preference to localStorage
 * - Detects mobile viewport with resize listener
 * - Manages drag interaction state
 * - SSR-safe (checks for window existence)
 *
 * @returns State and actions for minimap component
 *
 * @example
 * function GridMinimap() {
 *   const { isVisible, isDragging, isMobile, setIsDragging, toggleVisibility } = useMinimapState();
 *
 *   if (!isVisible) {
 *     return <button onClick={toggleVisibility}>Show Minimap</button>;
 *   }
 *
 *   return (
 *     <div>
 *       {isMobile ? <MobileOverlay /> : <DesktopMinimap />}
 *       <button onClick={toggleVisibility}>Hide</button>
 *     </div>
 *   );
 * }
 */
export function useMinimapState(): UseMinimapStateReturn {
  // Initialize visibility from localStorage (SSR-safe) - default closed
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === "true" : false;
    } catch {
      // localStorage may be unavailable (private mode, etc.)
      return false;
    }
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Initialize mobile detection (SSR-safe)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  // Persist visibility preference to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, String(isVisible));
    } catch {
      // Silently fail if localStorage unavailable
    }
  }, [isVisible]);

  // Mobile detection with resize listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set initial value
    checkMobile();

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Toggle visibility callback
  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return {
    isVisible,
    isDragging,
    isMobile,
    setIsDragging,
    toggleVisibility,
  };
}
