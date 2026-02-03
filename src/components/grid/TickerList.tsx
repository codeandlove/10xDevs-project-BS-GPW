/**
 * TickerList Component
 * Virtualized list of tickers with checkboxes for selection
 * Uses @tanstack/react-virtual for performance with 460+ items
 */

import { useRef, useCallback, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { GPWSymbol } from "@/types/nocodb.types";

interface TickerListProps {
  symbols: GPWSymbol[];
  selected: Set<string>;
  onToggle: (symbol: string) => void;
  height?: number;
  className?: string;
}

interface TickerRowProps {
  symbol: GPWSymbol;
  isSelected: boolean;
  onToggle: (symbol: string) => void;
}

/**
 * Single ticker row component
 * Memoized to prevent unnecessary re-renders
 */
const TickerRow = memo(({ symbol, isSelected, onToggle }: TickerRowProps) => {
  const handleChange = useCallback(() => {
    onToggle(symbol.symbol);
  }, [symbol.symbol, onToggle]);

  return (
    <label
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent"
      htmlFor={`ticker-${symbol.symbol}`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        id={`ticker-${symbol.symbol}`}
        checked={isSelected}
        onChange={handleChange}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label={`Wybierz ${symbol.name}`}
      />

      {/* Symbol and Name */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{symbol.symbol}</span>
          {symbol.label !== symbol.symbol && <span className="text-xs text-muted-foreground">({symbol.label})</span>}
        </div>
        <span className="truncate text-xs text-muted-foreground">{symbol.name}</span>
      </div>
    </label>
  );
});

TickerRow.displayName = "TickerRow";

/**
 * Virtualized list of tickers with checkboxes
 * Optimized for 460+ items with smooth 60 FPS scrolling
 */
export function TickerList({ symbols, selected, onToggle, height = 400, className = "" }: TickerListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualizer configuration
  const virtualizer = useVirtualizer({
    count: symbols.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // ~56px per row (py-2 + content)
    overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Empty state
  if (symbols.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border border-dashed ${className}`}
        style={{ height: `${height}px` }}
      >
        <p className="text-sm text-muted-foreground">Brak wyników</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto rounded-md border ${className}`}
      style={{ height: `${height}px` }}
      role="listbox"
      aria-label="Lista tickerów"
    >
      {/* Virtual scroll container */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {/* Virtualized items */}
        {virtualItems.map((virtualRow) => {
          const symbol = symbols[virtualRow.index];
          const isSelected = selected.has(symbol.symbol);

          return (
            <div
              key={symbol.symbol}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TickerRow symbol={symbol} isSelected={isSelected} onToggle={onToggle} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
