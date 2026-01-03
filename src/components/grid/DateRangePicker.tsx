/**
 * Date Range Picker Component
 * Allows custom date range selection with quick presets
 */

import { useState } from "react";
import type { DateRange } from "@/types/nocodb.types";
import { Button } from "@/components/ui/button";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const QUICK_PRESETS: { label: string; value: DateRange }[] = [
  { label: "Tydzień", value: "week" },
  { label: "Miesiąc", value: "month" },
  { label: "Kwartał", value: "quarter" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handlePresetClick = (preset: DateRange) => {
    setIsCustom(false);
    setError(null);
    onChange(preset);
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

    // Calculate days difference
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 365) {
      setError("Zakres nie może przekraczać 365 dni");
      return;
    }

    setError(null);
    onChange(`${fromDate}:${toDate}` as DateRange);
  };

  return (
    <div className="space-y-4">
      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        {QUICK_PRESETS.map((preset) => (
          <Button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            variant={value === preset.value ? "default" : "outline"}
            size="sm"
          >
            {preset.label}
          </Button>
        ))}
        <Button onClick={handleCustomToggle} variant={isCustom ? "default" : "outline"} size="sm">
          {isCustom ? "Ukryj własny" : "Własny zakres"}
        </Button>
      </div>

      {/* Custom Date Range */}
      {isCustom && (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="from-date" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="to-date" className="block text-sm font-medium text-gray-700 mb-1">
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
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button onClick={handleCustomApply} size="sm" className="w-full">
            Zastosuj
          </Button>
        </div>
      )}
    </div>
  );
}
