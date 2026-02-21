/**
 * Advanced Date Range Picker Component
 * Allows custom date range selection with calendar dropdown
 * Synchronizes with grid scroll state
 */

import { useState, useEffect } from "react";
import type { DateRange } from "@/types/nocodb.types";
import { Button } from "@/components/ui/button";

interface AdvancedDateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  visibleStartDate?: string; // Currently visible oldest date (from scroll)
  visibleEndDate?: string; // Currently visible newest date (from scroll)
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onPresetChange?: (preset: DateRange) => void;
}

const QUICK_PRESETS: { label: string; value: DateRange }[] = [
  { label: "Tydzień", value: "week" },
  { label: "Miesiąc", value: "month" },
  { label: "Kwartał", value: "quarter" },
];

export function AdvancedDateRangePicker({
  startDate,
  endDate,
  visibleStartDate,
  visibleEndDate,
  onDateRangeChange,
  onPresetChange,
}: AdvancedDateRangePickerProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [fromDate, setFromDate] = useState(startDate);
  const [toDate, setToDate] = useState(endDate);
  const [error, setError] = useState<string | null>(null);

  // Sync local state with props
  useEffect(() => {
    setFromDate(startDate);
    setToDate(endDate);
  }, [startDate, endDate]);

  const handlePresetClick = (preset: DateRange) => {
    setIsCustom(false);
    setError(null);
    if (onPresetChange) {
      onPresetChange(preset);
    }
  };

  const handleCustomToggle = () => {
    setIsCustom(!isCustom);
    setError(null);
  };

  const handleCustomApply = () => {
    // Validation
    if (!fromDate || !toDate) {
      setError("Proszę wybrać obie daty");
      return;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (from >= to) {
      setError("Data 'od' musi być wcześniejsza niż data 'do'");
      return;
    }

    const today = new Date();
    if (to > today) {
      setError("Data 'do' nie może być w przyszłości");
      return;
    }

    // No max range validation - user can select any date range
    // Performance/throttling handled server-side if needed

    setError(null);
    onDateRangeChange(fromDate, toDate);
    setIsCustom(false);
  };

  return (
    <div className="space-y-4">
      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        {QUICK_PRESETS.map((preset) => (
          <Button key={preset.value} onClick={() => handlePresetClick(preset.value)} variant="outline" size="sm">
            {preset.label}
          </Button>
        ))}
        <Button onClick={handleCustomToggle} variant={isCustom ? "default" : "outline"} size="sm">
          {isCustom ? "Ukryj własny zakres" : "Własny zakres"}
        </Button>
      </div>

      {/* Visible range indicator (if scrolling) */}
      {visibleStartDate && visibleEndDate && (visibleStartDate !== startDate || visibleEndDate !== endDate) && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
          <p className="text-blue-800">
            <span className="font-medium">Widoczny zakres:</span> {visibleStartDate} do {visibleEndDate}
          </p>
          <p className="mt-1 text-xs text-blue-600">
            <span className="font-medium">Załadowany zakres:</span> {startDate} do {endDate}
          </p>
        </div>
      )}

      {/* Custom Date Range */}
      {isCustom && (
        <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="from-date" className="mb-1 block text-sm font-medium text-gray-700">
                Od:
              </label>
              <input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="to-date" className="mb-1 block text-sm font-medium text-gray-700">
                Do:
              </label>
              <input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button onClick={handleCustomApply} size="sm" className="w-full">
            Zastosuj zakres
          </Button>
        </div>
      )}
    </div>
  );
}
