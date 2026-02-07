/**
 * Sort Options Component
 * Dropdown for sorting grid data
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type SortField = "date" | "percent_change" | "symbol";
export type SortDirection = "asc" | "desc";

interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

interface SortOptionsProps {
  value: { field: SortField; direction: SortDirection };
  onChange: (sort: { field: SortField; direction: SortDirection }) => void;
}

const SORT_OPTIONS: SortOption[] = [
  { field: "symbol", direction: "asc", label: "Symbol: A-Z" },
  { field: "symbol", direction: "desc", label: "Symbol: Z-A" },
  { field: "date", direction: "desc", label: "Data: najnowsze" },
  { field: "date", direction: "asc", label: "Data: najstarsze" },
  { field: "percent_change", direction: "desc", label: "Zmiana: największa" },
  { field: "percent_change", direction: "asc", label: "Zmiana: najmniejsza" },
];

export function SortOptions({ value, onChange }: SortOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentLabel =
    SORT_OPTIONS.find((opt) => opt.field === value.field && opt.direction === value.direction)?.label || "Sortuj...";

  const handleSelect = (option: SortOption) => {
    onChange({ field: option.field, direction: option.direction });
    setIsOpen(false);
  };

  const getIcon = () => {
    if (value.direction === "asc") return <ArrowUp className="h-4 w-4" />;
    if (value.direction === "desc") return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button onClick={() => setIsOpen(!isOpen)} variant="outline" size="sm" className="gap-2">
        {getIcon()}
        <span>{currentLabel}</span>
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
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border bg-white shadow-lg" role="listbox">
          <div className="p-2">
            {SORT_OPTIONS.map((option, index) => {
              const isSelected = option.field === value.field && option.direction === value.direction;
              return (
                <button
                  key={index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option)}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {option.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    <span>{option.label}</span>
                  </div>
                </button>
              );
            })}
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
