/**
 * Ticker filter component with multi-select
 * TODO: Install shadcn dropdown-menu component: npx shadcn@latest add dropdown-menu
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface TickerFilterProps {
  symbols: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function TickerFilter({ symbols, selected, onChange }: TickerFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSymbol = (symbol: string) => {
    const newSelected = selected.includes(symbol) ? selected.filter((s) => s !== symbol) : [...selected, symbol];
    onChange(newSelected);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="gap-2" aria-label="Filter by ticker">
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Tickery</span>
        {selected.length > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{selected.length}</span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Filtruj tickery</h3>
              {selected.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-auto p-1 text-xs">
                  Wyczyść
                </Button>
              )}
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {symbols.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak dostępnych tickerów</p>
              ) : (
                symbols.map((symbol) => (
                  <label
                    key={symbol}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(symbol)}
                      onChange={() => toggleSymbol(symbol)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{symbol}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
