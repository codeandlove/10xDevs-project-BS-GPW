/**
 * Event Detail View Component
 * Full page view with all event details and summaries
 */

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { EventHeader } from "@/components/summary/EventHeader";
import { Timeline } from "@/components/event/Timeline";
import { PriceChart } from "@/components/event/PriceChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchEventDetails, fetchSummaries } from "@/lib/api-service";
import type { BlackSwanEventDetailed, AISummary } from "@/types/nocodb.types";

interface EventDetailViewProps {
  eventId?: string;
}

export function EventDetailView({ eventId }: EventDetailViewProps) {
  const [event, setEvent] = useState<BlackSwanEventDetailed | null>(null);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) {
      setError(new Error("Event ID is missing"));
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch event details
        const eventResponse = await fetchEventDetails(eventId);
        setEvent(eventResponse.event);

        // Fetch all summaries
        if (eventResponse.event) {
          const summariesResponse = await fetchSummaries(
            eventResponse.event.symbol,
            eventResponse.event.occurrence_date,
            eventResponse.event.event_type
          );
          setSummaries(summariesResponse.summaries || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch event details"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleBack = () => {
    window.history.back();
  };

  return (
    <ErrorBoundary>
      <AppLayout
        scrollable={true}
        header={<Header showRangeSelector={false} showFilters={false} avatarMenu={<AvatarMenu />} />}
      >
        <div className="container mx-auto max-w-5xl px-4 py-6 md:px-6">
          {/* Back button */}
          <div className="mb-6">
            <Button onClick={handleBack} variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Powrót do gridu
            </Button>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <p className="mb-2 font-semibold text-red-900">Nie udało się załadować szczegółów wydarzenia</p>
              <p className="text-sm text-red-700">{error.message}</p>
              <Button onClick={handleBack} variant="outline" className="mt-4">
                Wróć do gridu
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && <DetailViewSkeleton />}

          {/* Content */}
          {!isLoading && !error && event && (
            <div className="space-y-8">
              {/* Event Header */}
              <div className="rounded-lg border bg-card p-6">
                <EventHeader
                  symbol={event.symbol}
                  occurrenceDate={event.occurrence_date}
                  eventType={event.event_type}
                  percentChange={event.percent_change}
                />

                {/* Additional event details */}
                <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
                  <DetailItem label="Open" value={`${event.open.toFixed(2)} PLN`} />
                  <DetailItem label="High" value={`${event.high.toFixed(2)} PLN`} />
                  <DetailItem label="Low" value={`${event.low.toFixed(2)} PLN`} />
                  <DetailItem label="Close" value={`${event.close.toFixed(2)} PLN`} />
                </div>
                <div className="mt-2 border-t pt-4">
                  <DetailItem label="Wolumen" value={event.volume.toLocaleString()} />
                </div>
              </div>

              {/* Price Chart */}
              {event.historic_data && event.historic_data.length > 0 && (
                <PriceChart data={event.historic_data} symbol={event.symbol} />
              )}

              {/* AI Summaries Timeline */}
              <div>
                <h2 className="mb-6 text-2xl font-bold">Podsumowania AI</h2>
                <Timeline summaries={summaries} />
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ErrorBoundary>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function DetailViewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="rounded-lg border p-6">
        <Skeleton width="40%" height={32} className="mb-4" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton width="100%" height={60} />
          <Skeleton width="100%" height={60} />
          <Skeleton width="100%" height={60} />
          <Skeleton width="100%" height={60} />
        </div>
      </div>
      <Skeleton width="100%" height={300} />
      <div className="space-y-4">
        <Skeleton width="30%" height={32} />
        <Skeleton width="100%" height={200} />
        <Skeleton width="100%" height={200} />
      </div>
    </div>
  );
}
