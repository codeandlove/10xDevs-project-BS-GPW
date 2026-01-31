/**
 * Blurred Demo Grid Component
 * Shows a blurred preview grid with fake data for users without subscription
 */

import { useMemo } from "react";
import { GridCell } from "./GridCell";
import { getDatesInRange } from "@/lib/ui-utils";
import type { DateRange, EventType } from "@/types/nocodb.types";
import type { GridCellData } from "@/types/ui.types";
import { Button } from "@/components/ui/button";

const DEMO_SYMBOLS = ["ABC", "XYZ", "QWE", "RTY"];
const DEMO_EVENT_TYPES: EventType[] = ["BLACK_SWAN_UP", "BLACK_SWAN_DOWN", "VOLATILITY_UP"];

interface BlurredDemoGridProps {
  range: DateRange;
}

export function BlurredDemoGrid({ range }: BlurredDemoGridProps) {
  // Generate fake data
  const { symbols, dates, fakeCells } = useMemo(() => {
    const datesInRange = getDatesInRange(range);
    const cells: GridCellData[][] = [];

    DEMO_SYMBOLS.forEach((symbol) => {
      const row: GridCellData[] = [];
      datesInRange.forEach((date) => {
        // Random events (30% chance)
        if (Math.random() > 0.7) {
          row.push({
            eventId: `demo-${symbol}-${date}`,
            symbol,
            date,
            eventType: DEMO_EVENT_TYPES[Math.floor(Math.random() * DEMO_EVENT_TYPES.length)],
            percentChange: Math.random() * 20 - 10, // -10% to +10%
            hasSummary: Math.random() > 0.5,
          });
        } else {
          row.push({
            eventId: null,
            symbol,
            date,
          });
        }
      });
      cells.push(row);
    });

    return {
      symbols: DEMO_SYMBOLS,
      dates: datesInRange,
      fakeCells: cells,
    };
  }, [range]);

  return (
    <div className="relative">
      {/* Blurred grid */}
      <div className="pointer-events-none select-none blur-[3px] opacity-70" aria-hidden="true">
        <div className="overflow-x-auto rounded-lg border">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full" role="grid">
                <thead className="bg-gray-50">
                  <tr role="row">
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Symbol
                    </th>
                    {dates.map((date) => (
                      <th
                        key={date}
                        className="px-4 py-3 text-center text-sm font-semibold text-gray-700"
                        role="columnheader"
                      >
                        {date}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((symbol, symbolIndex) => (
                    <tr key={symbol} role="row">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-gray-900">
                        {symbol}
                      </td>
                      {dates.map((date, dateIndex) => (
                        <td key={`${symbol}-${date}`} className="p-1">
                          <GridCell data={fakeCells[symbolIndex][dateIndex]} isSelected={false} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay with CTA */}
      <div className="absolute inset-0 z-20 flex items-start justify-center bg-gradient-to-b from-white/40 via-white/50 to-white/60 pt-32">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="text-center">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-blue-100 p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>

            {/* Heading */}
            <h3 className="mb-3 text-2xl font-bold text-gray-900">Odblokuj pełny dostęp</h3>

            {/* Description */}
            <p className="mb-6 text-gray-600">
              Zobacz rzeczywiste dane Black Swan events i uzyskaj dostęp do szczegółowych analiz AI.
            </p>

            {/* Features box */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4 text-left">
              <p className="mb-2 text-sm font-semibold text-gray-900">Co zyskujesz:</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>Pełny dostęp do historycznych danych</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>AI analizy wszystkich zdarzeń</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>Zaawansowane filtry i sortowanie</span>
                </li>
              </ul>
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              className="w-full text-base font-semibold shadow-sm"
              onClick={() => (window.location.href = "/checkout")}
            >
              Kup plan
            </Button>

            {/* Footer note */}
            <p className="mt-4 text-xs text-gray-500">7 dni za darmo • Anuluj w każdej chwili</p>
          </div>
        </div>
      </div>
    </div>
  );
}
