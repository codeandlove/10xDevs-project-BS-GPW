/**
 * Account Modal Component (Desktop)
 * Centered modal for account management
 */

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UserInfo } from "./UserInfo";
import { SubscriptionStatus } from "./SubscriptionStatus";
import { ManageSubscriptionButton } from "./ManageSubscriptionButton";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountModalProps {
  onClose: () => void;
}

export function AccountModal({ onClose }: AccountModalProps) {
  const { user, profile, isLoading, signOut } = useAuth();

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

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Dialog wrapper with proper keyboard support (ESC to close)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Modal content stops propagation, has keyboard support via wrapper */}
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={handleModalClick}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="modal-title" className="text-lg font-semibold">
            Moje konto
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Zamknij">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <ModalSkeleton />
          ) : user && profile ? (
            <div className="space-y-6">
              {/* User Info */}
              <UserInfo user={user} />

              {/* Subscription Status */}
              <SubscriptionStatus profile={profile} />

              {/* Actions */}
              <div className="space-y-3 border-t pt-4">
                <ManageSubscriptionButton />

                <Button onClick={handleSignOut} variant="outline" className="w-full gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Wyloguj się</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Nie można załadować danych konta</p>
              <Button onClick={onClose} className="mt-4" variant="outline">
                Zamknij
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Modal Skeleton Loader
 */
function ModalSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </div>
      <Skeleton className="h-25 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
