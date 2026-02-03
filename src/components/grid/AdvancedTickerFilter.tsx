/**
 * AdvancedTickerFilter Component
 * Modal with advanced ticker selection features:
 * - Search by symbol, label, or name
 * - Predefined GPW indices (WIG20, mWIG40, etc.)
 * - Select all / Deselect all
 * - Virtualized list for 460+ tickers
 */

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Filter } from "lucide-react";
import { useSymbols, searchSymbols } from "@/hooks/useSymbols";
import { TickerSearchInput } from "./TickerSearchInput";
import { TickerList } from "./TickerList";
import { GPW_INDICES, getIndexById } from "@/config/gpw-indices";

interface AdvancedTickerFilterProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  recentSymbols?: string[]; // "Ostatnie" symbols from smart initialization
}

export function AdvancedTickerFilter({ selected, onChange, recentSymbols }: AdvancedTickerFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selected));

  // Fetch symbols with caching
  const { symbols, isLoading, error } = useSymbols();

  // Filter symbols based on search query
  const filteredSymbols = useMemo(() => {
    return searchSymbols(searchQuery, symbols);
  }, [searchQuery, symbols]);

  // Reset local state when opening modal
  const handleOpen = useCallback(() => {
    setLocalSelected(new Set(selected));
    setSearchQuery("");
    setIsOpen(true);
  }, [selected]);

  // Apply selection and close modal
  const handleApply = useCallback(() => {
    onChange(Array.from(localSelected));
    setIsOpen(false);
  }, [localSelected, onChange]);

  // Cancel and close modal
  const handleCancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Toggle single ticker
  const handleToggle = useCallback((symbol: string) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }, []);

  // Select all filtered tickers
  const handleSelectAll = useCallback(() => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      filteredSymbols.forEach((s) => next.add(s.symbol));
      return next;
    });
  }, [filteredSymbols]);

  // Deselect all tickers
  const handleDeselectAll = useCallback(() => {
    setLocalSelected(new Set());
  }, []);

  // Select "ostatnie" tickers (from smart initialization)
  const handleSelectRecent = useCallback(() => {
    if (recentSymbols && recentSymbols.length > 0) {
      setLocalSelected(new Set(recentSymbols));
    }
  }, [recentSymbols]);

  // Select all tickers from a specific index
  const handleSelectIndex = useCallback((indexId: string) => {
    const index = getIndexById(indexId);
    if (!index) return;

    setLocalSelected((prev) => {
      const next = new Set(prev);
      index.symbols.forEach((symbol) => next.add(symbol));
      return next;
    });
  }, []);

  // Get only selected symbols that exist in current symbols list
  const selectedSymbols = useMemo(() => {
    return symbols.filter((s) => localSelected.has(s.symbol));
  }, [symbols, localSelected]);

  return (
    <>
      {/* Trigger Button */}
      <Button variant="outline" onClick={handleOpen} className="gap-2" aria-label="Filter by ticker">
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Tickery</span>
        {selected.length > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{selected.length}</span>
        )}
      </Button>

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Wybierz tickery</DialogTitle>
            <DialogDescription>
              Wyszukaj i wybierz spółki GPW, które chcesz analizować. Możesz również wybrać cały indeks.
            </DialogDescription>
          </DialogHeader>

          {/* Search and Actions */}
          <div className="space-y-4">
            {/* Search Input */}
            <TickerSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Szukaj po symbolu, nazwie lub skrócie..."
              disabled={isLoading}
            />

            {/* Index Selection and Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Index Selector */}
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(e) => {
                  if (e.target.value) {
                    handleSelectIndex(e.target.value);
                    e.target.value = ""; // Reset selection
                  }
                }}
                defaultValue=""
                disabled={isLoading}
                aria-label="Wybierz indeks GPW"
              >
                <option value="" disabled>
                  Wybierz indeks...
                </option>
                {GPW_INDICES.map((index) => (
                  <option key={index.id} value={index.id}>
                    {index.name} ({index.symbols.length})
                  </option>
                ))}
              </select>

              {/* Bulk Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isLoading || filteredSymbols.length === 0}
                >
                  Zaznacz wszystkie
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={isLoading || localSelected.size === 0}
                >
                  Odznacz wszystkie
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectRecent}
                  disabled={isLoading || !recentSymbols || recentSymbols.length === 0}
                  title="Zaznacz tickery z ostatniej inicjalizacji"
                >
                  Zaznacz ostatnie ({recentSymbols?.length || 0})
                </Button>
              </div>
            </div>

            {/* Selected Count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Zaznaczono: <strong>{localSelected.size}</strong> / {symbols.length}
              </span>
              {searchQuery && (
                <span>
                  Wyników wyszukiwania: <strong>{filteredSymbols.length}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">Ładowanie tickerów...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex h-64 flex-col items-center justify-center gap-2">
                <p className="text-sm text-destructive">Błąd ładowania tickerów</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Spróbuj ponownie
                </Button>
              </div>
            )}

            {/* Selected Tickers (if any) */}
            {!isLoading && !error && selectedSymbols.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">Zaznaczone ({selectedSymbols.length})</h4>
                <TickerList
                  symbols={selectedSymbols}
                  selected={localSelected}
                  onToggle={handleToggle}
                  height={150}
                  className="mb-4"
                />
              </div>
            )}

            {/* All Available Tickers */}
            {!isLoading && !error && (
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  {searchQuery
                    ? `Wyniki wyszukiwania (${filteredSymbols.length})`
                    : `Wszystkie tickery (${symbols.length})`}
                </h4>
                <TickerList
                  symbols={filteredSymbols}
                  selected={localSelected}
                  onToggle={handleToggle}
                  height={selectedSymbols.length > 0 ? 250 : 400}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Anuluj
            </Button>
            <Button
              onClick={handleApply}
              disabled={isLoading || localSelected.size === 0}
              title={localSelected.size === 0 ? "Musisz zaznaczyć przynajmniej jeden ticker" : undefined}
            >
              Zastosuj ({localSelected.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
