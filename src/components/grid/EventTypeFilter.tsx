/**
 * Event Type Filter Component
 * Multi-select filter for event types
 */

import { useState } from "react";
import type { EventType } from "@/types/nocodb.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllEventTypeColors } from "@/config/event-type-colors";

interface EventTypeFilterProps {
  selected: EventType[];
  onChange: (types: EventType[]) => void;
}

// Get event types with their colors from central configuration
const EVENT_TYPES = getAllEventTypeColors().map(({ value, colors }) => ({
  value,
  label: colors.label,
  color: colors.badge,
}));

export function EventTypeFilter({ selected, onChange }: EventTypeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (type: EventType) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  const handleSelectAll = () => {
    onChange(EVENT_TYPES.map((t) => t.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const isAllSelected = selected.length === EVENT_TYPES.length;
  const hasSelection = selected.length > 0;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button onClick={() => setIsOpen(!isOpen)} variant="outline" size="sm" className="gap-2">
        <span>Typy zdarzeń</span>
        {hasSelection && (
          <Badge variant="secondary" className="ml-1">
            {selected.length}
          </Badge>
        )}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border bg-white shadow-lg">
          <div className="p-3 space-y-3">
            {/* Select All / Clear All */}
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-medium text-gray-700">Filtry typów</span>
              <div className="flex gap-2">
                {!isAllSelected && (
                  <button onClick={handleSelectAll} className="text-xs text-primary hover:underline">
                    Zaznacz wszystkie
                  </button>
                )}
                {hasSelection && (
                  <button onClick={handleClearAll} className="text-xs text-red-600 hover:underline">
                    Wyczyść
                  </button>
                )}
              </div>
            </div>

            {/* Event Type Checkboxes */}
            <div className="space-y-2">
              {EVENT_TYPES.map((type) => {
                const isSelected = selected.includes(type.value);
                return (
                  <label
                    key={type.value}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded p-2"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(type.value)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className={`h-3 w-3 rounded-full ${type.color}`} />
                    <span className="text-sm text-gray-900">{type.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Close button */}
          <div className="border-t p-2">
            <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm" className="w-full">
              Zamknij
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
