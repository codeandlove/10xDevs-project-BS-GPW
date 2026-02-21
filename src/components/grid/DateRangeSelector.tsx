/**
 * Date Range Selector Component (Dropdown)
 * Unified component replacing RangeSelector + AdvancedDateRangePicker
 * Allows preset selection (Week/Month/Quarter) and custom date range via dialog
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { DateRange } from "@/types/nocodb.types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface DateRangeSelectorProps {
  currentRange: DateRange;
  startDate: string; // YYYY-MM-DD (for display when custom)
  endDate: string; // YYYY-MM-DD (for display when custom)
  onPresetChange: (preset: DateRange) => void;
  onCustomRangeChange: (startDate: string, endDate: string) => void;
}

const QUICK_PRESETS: { label: string; value: DateRange }[] = [
  { label: "Tydzień", value: "week" },
  { label: "Miesiąc", value: "month" },
  { label: "Kwartał", value: "quarter" },
];

export function DateRangeSelector({
  currentRange,
  startDate,
  endDate,
  onPresetChange,
  onCustomRangeChange,
}: DateRangeSelectorProps) {
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [fromDate, setFromDate] = useState(startDate);
  const [toDate, setToDate] = useState(endDate);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sync local state with props
  useEffect(() => {
    setFromDate(startDate);
    setToDate(endDate);
  }, [startDate, endDate]);

  // Determine display label
  const getDisplayLabel = () => {
    const preset = QUICK_PRESETS.find((p) => p.value === currentRange);
    if (preset) {
      // Check if current dates actually match the preset
      const today = new Date();
      const start = new Date(startDate);
      const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Expected days for each preset
      const expectedDays: Record<DateRange, number> = {
        week: 7,
        month: 30,
        quarter: 90,
      };

      const expected = expectedDays[currentRange as keyof typeof expectedDays];

      // If dates match preset (±1 day tolerance), show preset name
      if (expected && Math.abs(daysDiff - expected) <= 1) {
        return preset.label;
      }
    }

    // Show custom date range in shorter format (DD.MM - DD.MM.YYYY)
    const formatDate = (dateStr: string) => {
      const [, month, day] = dateStr.split("-");
      return `${day}.${month}`;
    };

    const [endYear] = endDate.split("-");
    return `${formatDate(startDate)} - ${formatDate(endDate)}.${endYear}`;
  };

  const handlePresetSelect = (preset: DateRange) => {
    setIsCustomDialogOpen(false);
    setError(null);
    setDropdownOpen(false);
    onPresetChange(preset);
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

    setError(null);
    onCustomRangeChange(fromDate, toDate);
    setIsCustomDialogOpen(false);
    setDropdownOpen(false);
  };

  const handleCustomCancel = () => {
    setIsCustomDialogOpen(false);
    setError(null);
    // Reset to current range dates
    setFromDate(startDate);
    setToDate(endDate);
  };

  return (
    <div className="relative">
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[160px] justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="text-sm">📅</span>
              <span className="truncate">{getDisplayLabel()}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {QUICK_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.value}
              onClick={() => handlePresetSelect(preset.value)}
              className={currentRange === preset.value ? "bg-accent" : ""}
            >
              <span className="flex items-center gap-2">
                {currentRange === preset.value && <span className="text-xs">✓</span>}
                {preset.label}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCustomDialogOpen(true)}>Własny zakres...</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Date Range Dialog (Overlay) */}
      {isCustomDialogOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/50"
              onClick={handleCustomCancel}
              onKeyDown={(e) => e.key === "Escape" && handleCustomCancel()}
              role="button"
              tabIndex={-1}
              aria-label="Close dialog"
            />

            {/* Dialog */}
            <div className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold">Wybierz zakres dat</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="custom-from-date" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Od:
                    </label>
                    <input
                      id="custom-from-date"
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-to-date" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Do:
                    </label>
                    <input
                      id="custom-to-date"
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleCustomApply} className="flex-1">
                    Zastosuj
                  </Button>
                  <Button onClick={handleCustomCancel} variant="outline" className="flex-1">
                    Anuluj
                  </Button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
