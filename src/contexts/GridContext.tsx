/**
 * Grid Context for managing grid state
 * Handles filters, selected event, and URL synchronization
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { DateRange, EventType } from "@/types/nocodb.types";
import type { GridState } from "@/types/ui.types";

interface GridContextValue {
  gridState: GridState;
  setRange: (range: DateRange) => void;
  setSymbols: (symbols: string[]) => void;
  setEventTypes: (types: EventType[]) => void;
  setSort: (sort: { field: "date" | "percent_change" | "symbol"; direction: "asc" | "desc" }) => void;
  setEventId: (eventId: string | undefined) => void;
  clearFilters: () => void;
  recentSymbols: string[]; // Cached "ostatnie" symbols from smart initialization
  setRecentSymbols: (symbols: string[]) => void;
  isInitialized: boolean; // Flag to prevent re-initialization on "Odznacz wszystkie"
  setIsInitialized: (value: boolean) => void;
}

interface GridProviderProps {
  children: ReactNode;
  initialState?: Partial<GridState>;
}

const GridContext = createContext<GridContextValue | undefined>(undefined);

/**
 * Parse URL params for initial state
 */
function getInitialStateFromUrl(): GridState {
  if (typeof window === "undefined") {
    return {
      range: "week",
      symbols: [],
      eventTypes: [],
      sortField: "symbol",
      sortDirection: "asc",
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    range: (params.get("range") as DateRange) || "week",
    symbols: params.get("symbols")?.split(",").filter(Boolean) || [],
    eventTypes: (params.get("eventTypes")?.split(",").filter(Boolean) as EventType[]) || [],
    eventId: params.get("eventId") || undefined,
    sortField: (params.get("sortField") as "date" | "percent_change" | "symbol") || "symbol",
    sortDirection: (params.get("sortDirection") as "asc" | "desc") || "asc",
  };
}

/**
 * Update URL params without page reload
 */
function updateUrlParams(state: Partial<GridState>): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  if (state.range) params.set("range", state.range);
  if (state.symbols !== undefined) {
    if (state.symbols.length > 0) {
      params.set("symbols", state.symbols.join(","));
    } else {
      params.delete("symbols");
    }
  }
  if (state.eventTypes !== undefined) {
    if (state.eventTypes.length > 0) {
      params.set("eventTypes", state.eventTypes.join(","));
    } else {
      params.delete("eventTypes");
    }
  }
  if (state.eventId !== undefined) {
    if (state.eventId) {
      params.set("eventId", state.eventId);
    } else {
      params.delete("eventId");
    }
  }

  // Handle sort parameters
  if (state.sortField !== undefined && state.sortDirection !== undefined) {
    // Only add to URL if not default
    if (state.sortField !== "symbol" || state.sortDirection !== "asc") {
      params.set("sortField", state.sortField);
      params.set("sortDirection", state.sortDirection);
    } else {
      params.delete("sortField");
      params.delete("sortDirection");
    }
  }

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, "", newUrl);
}

export function GridProvider({ children, initialState }: GridProviderProps) {
  // Use initialState from props (passed from Astro server-side) or default
  const [gridState, setGridState] = useState<GridState>(() => {
    const defaultState: GridState = {
      range: "week",
      symbols: [],
      eventTypes: [],
      sortField: "symbol",
      sortDirection: "asc",
    };
    return { ...defaultState, ...initialState };
  });

  // State for "ostatnie" symbols (cached from smart initialization)
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);

  // Flag to prevent re-initialization when user clears symbols
  const [isInitialized, setIsInitialized] = useState(false);

  // Update URL when state changes
  useEffect(() => {
    updateUrlParams(gridState);
  }, [gridState]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setGridState(getInitialStateFromUrl());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setRange = useCallback((range: DateRange) => {
    setGridState((prev) => ({ ...prev, range }));
  }, []);

  const setSymbols = useCallback((symbols: string[]) => {
    setGridState((prev) => ({ ...prev, symbols }));
  }, []);

  const setEventTypes = useCallback((eventTypes: EventType[]) => {
    setGridState((prev) => ({ ...prev, eventTypes }));
  }, []);

  const setSort = useCallback((sort: { field: "date" | "percent_change" | "symbol"; direction: "asc" | "desc" }) => {
    setGridState((prev) => ({ ...prev, sortField: sort.field, sortDirection: sort.direction }));
  }, []);

  const setEventId = useCallback((eventId: string | undefined) => {
    setGridState((prev) => ({ ...prev, eventId }));
  }, []);

  const clearFilters = useCallback(() => {
    setGridState((prev) => ({
      ...prev,
      symbols: [],
      eventTypes: [],
      eventId: undefined,
      sortField: "symbol",
      sortDirection: "asc",
    }));
  }, []);

  const value: GridContextValue = {
    gridState,
    setRange,
    setSymbols,
    setEventTypes,
    setSort,
    setEventId,
    clearFilters,
    recentSymbols,
    setRecentSymbols,
    isInitialized,
    setIsInitialized,
  };

  return <GridContext.Provider value={value}>{children}</GridContext.Provider>;
}

/**
 * Hook to use grid context
 */
export function useGrid() {
  const context = useContext(GridContext);
  if (context === undefined) {
    throw new Error("useGrid must be used within GridProvider");
  }
  return context;
}
