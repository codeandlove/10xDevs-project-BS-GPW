/**
 * Grid Page Wrapper
 * Wraps GridView with GridProvider to ensure context is available
 * This is necessary in Astro because each client:load creates a separate React island
 */

import { GridProvider } from "@/contexts/GridContext";
import { GridView } from "./GridView";
import type { DateRange, EventType } from "@/types/nocodb.types";

interface GridPageWrapperProps {
  initialRange?: string;
  initialSymbols?: string;
  initialEventTypes?: string;
  initialEventId?: string;
}

export function GridPageWrapper({
  initialRange = "week",
  initialSymbols = "",
  initialEventTypes = "",
  initialEventId = "",
}: GridPageWrapperProps) {
  // Parse initial values from Astro props
  const range = (initialRange as DateRange) || "week";
  const symbols = initialSymbols ? initialSymbols.split(",").filter(Boolean) : [];
  const eventTypes = initialEventTypes ? (initialEventTypes.split(",").filter(Boolean) as EventType[]) : [];
  const eventId = initialEventId || undefined;

  return (
    <GridProvider
      initialState={{
        range,
        symbols,
        eventTypes,
        eventId,
      }}
    >
      <GridView />
    </GridProvider>
  );
}
