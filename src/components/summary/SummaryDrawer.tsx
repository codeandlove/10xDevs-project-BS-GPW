/**
 * Summary Drawer Component (Mobile)
 * Bottom drawer (70% height) with swipe-to-dismiss for mobile devices
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

interface SummaryDrawerProps {
  event: BlackSwanEventDetailed | null;
  isLoading?: boolean;
  error?: Error | null;
  onClose: () => void;
  onViewMore?: () => void;
  onRetry?: () => void;
}

export function SummaryDrawer({ event, isLoading, error, onClose, onViewMore, onRetry }: SummaryDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Focus management - initial focus on close button
  useEffect(() => {
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, []);

  // Focus trap
  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !drawerRef.current) return;

      const focusableElements = drawerRef.current.querySelectorAll(
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

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Swipe to dismiss handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !drawerRef.current) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    // Only allow downward swipe
    if (diff > 0) {
      drawerRef.current.style.transform = `translateY(${diff}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current || !drawerRef.current) return;

    const diff = currentY.current - startY.current;

    // If swiped down more than 100px, close drawer
    if (diff > 100) {
      onClose();
    } else {
      // Snap back to original position
      drawerRef.current.style.transform = "translateY(0)";
    }

    isDragging.current = false;
  }, [onClose]);

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleDrawerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!event && !isLoading) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl transition-transform"
        style={{ maxHeight: "70vh" }}
        onClick={handleDrawerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe handle */}
        <div className="flex justify-center py-2" aria-label="Przeciągnij w dół aby zamknąć">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id="drawer-title" className="font-semibold">
            Szczegóły wydarzenia
          </h2>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label="Zamknij">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content - scrollable */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(70vh - 80px)" }}>
          {isLoading ? (
            <DrawerSkeleton />
          ) : error ? (
            <div className="text-center">
              <p className="mb-2 font-medium text-destructive">Nie udało się załadować danych</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              <div className="mt-4 flex gap-2 justify-center">
                {onRetry && (
                  <Button onClick={onRetry} variant="default" size="sm">
                    Spróbuj ponownie
                  </Button>
                )}
                <Button onClick={onClose} variant="outline" size="sm">
                  Zamknij
                </Button>
              </div>
            </div>
          ) : event ? (
            <div className="space-y-4">
              <EventHeader
                symbol={event.symbol}
                occurrenceDate={event.occurrence_date}
                eventType={event.event_type}
                percentChange={event.percent_change}
              />

              {event.first_summary ? (
                <>
                  <SummaryCard summary={event.first_summary} showFullDetails={false} />

                  {onViewMore && (
                    <div className="border-t pt-4">
                      <Button onClick={onViewMore} className="w-full" variant="outline" size="sm">
                        Zobacz więcej
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">Brak dostępnego podsumowania AI.</p>
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
 * Drawer Skeleton Loader
 */
function DrawerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton width="60%" height={24} />
        <Skeleton width="40%" height={16} />
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" height={60} />
      </div>
      <div className="space-y-2">
        <Skeleton width="30%" height={16} />
        <Skeleton width="100%" height={32} />
      </div>
    </div>
  );
}
