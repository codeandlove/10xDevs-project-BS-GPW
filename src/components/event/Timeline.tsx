/**
 * Timeline Component
 * Displays multiple AI summaries in chronological order
 */

import { formatDate } from "@/lib/ui-utils";
import { SummaryCard } from "@/components/summary/SummaryCard";
import type { AISummary } from "@/types/nocodb.types";

interface TimelineProps {
  summaries: AISummary[];
}

export function Timeline({ summaries }: TimelineProps) {
  if (summaries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">Brak dostępnych podsumowań AI dla tego wydarzenia.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-border" aria-hidden="true" />

      {/* Timeline items */}
      <div className="space-y-8">
        {summaries.map((summary, index) => (
          <div key={summary.id} className="relative flex gap-6">
            {/* Timeline dot */}
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <div className="absolute h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
            </div>

            {/* Summary card */}
            <div className="flex-1 pb-8">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Podsumowanie {index + 1}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <time className="text-xs text-muted-foreground">{formatDate(summary.date)}</time>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <SummaryCard summary={summary} showFullDetails />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
