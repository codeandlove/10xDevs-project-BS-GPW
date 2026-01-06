/**
 * Summary Sidebar Component (Desktop)
 * Right-side sidebar (33% width) displaying event details with AI summary
 * Includes focus management per ui-plan.md
 */

import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventHeader } from "./EventHeader";
import { SummaryCard } from "./SummaryCard";
import { Skeleton } from "@/components/ui/Skeleton";
import type { BlackSwanEventDetailed } from "@/types/nocodb.types";

interface SummarySidebarProps {
  event: BlackSwanEventDetailed | null;
  isLoading?: boolean;
  error?: Error | null;
  onClose: () => void;
  onViewMore?: () => void;
  onRetry?: () => void;
}

export function SummarySidebar({ event, isLoading, error, onClose, onViewMore, onRetry }: SummarySidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Focus management - initial focus on close button
  useEffect(() => {
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, []);

  // Focus trap - keep focus within sidebar
  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !sidebarRef.current) return;

      const focusableElements = sidebarRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSidebarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!event && !isLoading) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sidebar-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="relative z-10 w-full max-w-md overflow-y-auto bg-white shadow-2xl"
        onClick={handleSidebarClick}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 id="sidebar-title" className="text-lg font-semibold">
            Szczegóły wydarzenia
          </h2>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label="Zamknij">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <SidebarSkeleton />
          ) : error ? (
            <div className="text-center">
              <p className="mb-2 font-medium text-destructive">Nie udało się załadować danych</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              <div className="mt-4 flex gap-2 justify-center">
                {onRetry && (
                  <Button onClick={onRetry} variant="default">
                    Spróbuj ponownie
                  </Button>
                )}
                <Button onClick={onClose} variant="outline">
                  Zamknij
                </Button>
              </div>
            </div>
          ) : event ? (
            <div className="space-y-6">
              <EventHeader
                symbol={event.symbol}
                occurrenceDate={event.occurrence_date}
                eventType={event.event_type}
                percentChange={event.percent_change}
              />

              {event.first_summary ? (
                <>
                  <SummaryCard summary={event.first_summary} />

                  {onViewMore && (
                    <div className="border-t pt-4">
                      <Button onClick={onViewMore} className="w-full" variant="outline">
                        Zobacz wszystkie podsumowania
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">Brak dostępnego podsumowania AI dla tego wydarzenia.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Sidebar Skeleton Loader
 */
function SidebarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton width="60%" height={32} />
        <Skeleton width="40%" height={20} />
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" height={80} />
      </div>
      <div className="space-y-2">
        <Skeleton width="30%" height={20} />
        <Skeleton width="100%" height={40} />
      </div>
    </div>
  );
}
