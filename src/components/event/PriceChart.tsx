/**
 * Price Chart Component
 * Displays historic OHLC data as a simple line chart
 * Note: For production, consider using recharts or lightweight-charts
 */

import type { HistoricDataPoint } from "@/types/nocodb.types";
import { formatDate } from "@/lib/ui-utils";

interface PriceChartProps {
  data: HistoricDataPoint[];
  symbol: string;
}

export function PriceChart({ data, symbol }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">Brak danych historycznych dla {symbol}</p>
      </div>
    );
  }

  // Calculate min/max for scaling
  const prices = data.map((d) => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Simple SVG path for close prices
  const width = 800;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.close - minPrice) / priceRange) * chartHeight;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Wykres historyczny</h3>
        <p className="text-sm text-muted-foreground">Ceny zamknięcia dla {symbol}</p>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={`Wykres cenowy dla ${symbol}`}
        >
          {/* Grid lines */}
          <g stroke="currentColor" strokeWidth="1" opacity="0.1">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                y1={padding + chartHeight * ratio}
                x2={width - padding}
                y2={padding + chartHeight * ratio}
              />
            ))}
          </g>

          {/* Price line */}
          <path
            d={pathData}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((point, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = padding + chartHeight - ((point.close - minPrice) / priceRange) * chartHeight;
            return (
              <circle key={index} cx={x} cy={y} r="3" fill="hsl(var(--primary))" className="hover:r-5 transition-all">
                <title>
                  {formatDate(point.date)}: {point.close.toFixed(2)} PLN
                </title>
              </circle>
            );
          })}

          {/* Y-axis labels */}
          <text x={padding - 10} y={padding} textAnchor="end" fontSize="12" fill="currentColor" opacity="0.6">
            {maxPrice.toFixed(2)}
          </text>
          <text x={padding - 10} y={height - padding} textAnchor="end" fontSize="12" fill="currentColor" opacity="0.6">
            {minPrice.toFixed(2)}
          </text>
        </svg>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
        <StatItem label="Min" value={`${minPrice.toFixed(2)} PLN`} />
        <StatItem label="Max" value={`${maxPrice.toFixed(2)} PLN`} />
        <StatItem
          label="Zmiana"
          value={`${(((data[data.length - 1].close - data[0].close) / data[0].close) * 100).toFixed(2)}%`}
        />
        <StatItem label="Punktów" value={data.length.toString()} />
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
