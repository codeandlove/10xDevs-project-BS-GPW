/**
 * TickerSearchInput Component
 * Search input with icon and clear button for ticker filtering
 */

import { useCallback } from "react";
import { Search, X } from "lucide-react";

interface TickerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Search input for ticker filtering
 * Features:
 * - Search icon (left)
 * - Clear button (right, visible when value is not empty)
 * - Auto-focus support
 * - Keyboard accessible
 */
export function TickerSearchInput({
  value,
  onChange,
  placeholder = "Szukaj tickera...",
  disabled = false,
}: TickerSearchInputProps) {
  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="relative w-full">
      {/* Search Icon */}
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Wyszukaj ticker"
        autoComplete="off"
      />

      {/* Clear Button */}
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          aria-label="Wyczyść wyszukiwanie"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
