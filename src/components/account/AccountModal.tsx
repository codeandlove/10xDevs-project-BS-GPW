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
import { Skeleton } from "@/components/ui/Skeleton";

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={handleModalClick}
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
        <Skeleton width={48} height={48} className="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} />
        </div>
      </div>
      <Skeleton width="100%" height={100} />
      <div className="space-y-3">
        <Skeleton width="100%" height={40} />
        <Skeleton width="100%" height={40} />
      </div>
    </div>
  );
}
