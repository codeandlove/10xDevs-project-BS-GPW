/**
 * Event Header Component
 * Displays event basic information (symbol, date, type, percent change)
 */

import type { EventType } from "@/types/nocodb.types";
import { formatDate, formatPercentChange, getEventTypeColor } from "@/lib/ui-utils";

interface EventHeaderProps {
  symbol: string;
  occurrenceDate: string;
  eventType: EventType;
  percentChange: number;
}

export function EventHeader({ symbol, occurrenceDate, eventType, percentChange }: EventHeaderProps) {
  const colorClass = getEventTypeColor(eventType);
  const percentText = formatPercentChange(percentChange);
  const dateText = formatDate(occurrenceDate);

  return (
    <div className="border-b pb-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{symbol}</h2>
          <p className="text-sm text-muted-foreground">{dateText}</p>
        </div>
        <div className={`rounded-lg border px-3 py-1 text-center ${colorClass}`}>
          <div className="text-xs font-medium uppercase opacity-75">{eventType.replace(/_/g, " ")}</div>
          <div className="text-lg font-bold">{percentText}</div>
        </div>
      </div>
    </div>
  );
}
