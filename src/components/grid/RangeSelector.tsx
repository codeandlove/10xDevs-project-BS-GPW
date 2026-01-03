/**
 * Range selector component for switching between week/month/quarter views
 */

import type { DateRange } from "@/types/nocodb.types";

interface RangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const ranges: { value: DateRange; label: string }[] = [
  { value: "week", label: "Tydzień" },
  { value: "month", label: "Miesiąc" },
  { value: "quarter", label: "Kwartał" },
];

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border bg-background p-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`
            rounded px-3 py-1.5 text-sm font-medium transition-colors
            ${
              value === range.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          `}
          aria-pressed={value === range.value}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
