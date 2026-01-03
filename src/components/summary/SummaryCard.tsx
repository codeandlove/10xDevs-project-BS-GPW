/**
 * Summary Card Component
 * Displays AI-generated summary with sentiment, causes, trends, and recommendations
 */

import type { AISummary } from "@/types/nocodb.types";
import { getSentimentColor, getSentimentLabel, formatDate } from "@/lib/ui-utils";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SummaryCardProps {
  summary: AISummary;
  showFullDetails?: boolean;
}

export function SummaryCard({ summary, showFullDetails = true }: SummaryCardProps) {
  const sentimentColor = getSentimentColor(summary.article_sentiment);
  const sentimentLabel = getSentimentLabel(summary.article_sentiment);

  return (
    <div className="space-y-4">
      {/* Summary Text */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Podsumowanie AI</h3>
        <p className="text-sm leading-relaxed">{summary.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(summary.date)}</p>
      </div>

      {/* Sentiment */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Sentyment artykułu</h3>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${sentimentColor}`}
        >
          {sentimentLabel}
        </span>
      </div>

      {/* Identified Causes */}
      {summary.identified_causes && summary.identified_causes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Zidentyfikowane przyczyny</h3>
          <ul className="space-y-1">
            {summary.identified_causes.map((cause, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trend Probability */}
      {showFullDetails && summary.predicted_trend_probability && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Prognoza trendu</h3>
          <div className="space-y-2">
            {summary.predicted_trend_probability.further_decline !== undefined && (
              <TrendBar
                label="Dalszy spadek"
                value={summary.predicted_trend_probability.further_decline}
                icon={<TrendingDown className="h-4 w-4 text-red-600" />}
                color="bg-red-500"
              />
            )}
            {summary.predicted_trend_probability.recovery !== undefined && (
              <TrendBar
                label="Odreagowanie"
                value={summary.predicted_trend_probability.recovery}
                icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                color="bg-green-500"
              />
            )}
            {summary.predicted_trend_probability.continued_growth !== undefined && (
              <TrendBar
                label="Kontynuacja wzrostu"
                value={summary.predicted_trend_probability.continued_growth}
                icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
                color="bg-blue-500"
              />
            )}
          </div>
        </div>
      )}

      {/* Source Link */}
      {summary.source_url && (
        <div>
          <Button variant="outline" size="sm" asChild>
            <a href={summary.source_url} target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Artykuł źródłowy
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Trend Bar Component
 */
function TrendBar({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
