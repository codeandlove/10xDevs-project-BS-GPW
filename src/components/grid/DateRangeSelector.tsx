/**
 * Date Range Selector Component
 * Opens a custom date range dialog directly (no range presets).
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown, Calendar } from "lucide-react";

interface DateRangeSelectorProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onCustomRangeChange: (startDate: string, endDate: string) => void;
}

export function DateRangeSelector({ startDate, endDate, onCustomRangeChange }: DateRangeSelectorProps) {
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [fromDate, setFromDate] = useState(startDate);
  const [toDate, setToDate] = useState(endDate);
  const [error, setError] = useState<string | null>(null);

  // Sync local state with props
  useEffect(() => {
    setFromDate(startDate);
    setToDate(endDate);
  }, [startDate, endDate]);

  // Always show explicit date range in DD.MM - DD.MM.YYYY format
  const getDisplayLabel = () => {
    const formatDate = (dateStr: string) => {
      const [, month, day] = dateStr.split("-");
      return `${day}.${month}`;
    };
    const [endYear] = endDate.split("-");
    return `${formatDate(startDate)} - ${formatDate(endDate)}.${endYear}`;
  };

  const handleCustomApply = () => {
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
  };

  const handleCustomCancel = () => {
    setIsCustomDialogOpen(false);
    setError(null);
    setFromDate(startDate);
    setToDate(endDate);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="min-w-[160px] justify-between gap-2"
        onClick={() => setIsCustomDialogOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{getDisplayLabel()}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

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
