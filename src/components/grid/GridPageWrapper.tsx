/**
 * Grid Page Wrapper
 * Wraps GridView with AuthProvider and GridProvider to ensure contexts are available
 * This is necessary in Astro because each client:load creates a separate React island
 */

import { AuthProvider } from "@/contexts/AuthContext";
import { GridProvider } from "@/contexts/GridContext";
import { GridView } from "./GridView";
import type { DateRange, EventType } from "@/types/nocodb.types";

interface GridPageWrapperProps {
  initialRange?: string;
  initialSymbols?: string;
  initialEventTypes?: string;
  initialEventId?: string;
  initialSortField?: string;
  initialSortDirection?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function GridPageWrapper({
  initialRange = "week",
  initialSymbols = "",
  initialEventTypes = "",
  initialEventId = "",
  initialSortField = "symbol",
  initialSortDirection = "asc",
  initialStartDate = "",
  initialEndDate = "",
}: GridPageWrapperProps) {
  // Parse initial values from Astro props
  const range = (initialRange as DateRange) || "week";
  const symbols = initialSymbols ? initialSymbols.split(",").filter(Boolean) : [];
  const eventTypes = initialEventTypes ? (initialEventTypes.split(",").filter(Boolean) as EventType[]) : [];
  const eventId = initialEventId || undefined;
  const sortField = (initialSortField as "date" | "percent_change" | "symbol") || "symbol";
  const sortDirection = (initialSortDirection as "asc" | "desc") || "asc";
  const startDate = initialStartDate || undefined;
  const endDate = initialEndDate || undefined;

  return (
    <AuthProvider>
      <GridProvider
        initialState={{
          range,
          symbols,
          eventTypes,
          eventId,
          sortField,
          sortDirection,
          startDate,
          endDate,
        }}
      >
        <GridView />
      </GridProvider>
    </AuthProvider>
  );
}
