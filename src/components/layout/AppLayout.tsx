/**
 * Main application layout for authenticated views
 */

import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

interface AppLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  showSubscriptionBanner?: boolean;
  /**
   * Controls scroll behavior:
   * - false (default): Fixed height (h-screen), no page scroll - for Grid view with internal scroll
   * - true: Scrollable page content - for Event Detail and other content pages
   */
  scrollable?: boolean;
}

function AppLayoutContent({ children, header, showSubscriptionBanner = true, scrollable = false }: AppLayoutProps) {
  const { profile } = useAuth();

  const handleUpgrade = () => {
    // TODO: Redirect to checkout or portal
    window.location.href = "/checkout";
  };

  // For scrollable pages (event detail), use min-h-screen and allow overflow
  // For fixed pages (grid), use h-screen and prevent overflow
  const containerClass = scrollable
    ? "flex min-h-screen flex-col bg-background"
    : "flex h-screen flex-col overflow-hidden bg-background";

  const mainClass = scrollable ? "flex-1" : "flex-1 overflow-hidden";

  return (
    <div className={containerClass}>
      {header}
      {showSubscriptionBanner && profile && <SubscriptionBanner profile={profile} onUpgrade={handleUpgrade} />}
      <main className={mainClass}>{children}</main>
      <ToastContainer />
    </div>
  );
}

export function AppLayout(props: AppLayoutProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppLayoutContent {...props} />
      </ToastProvider>
    </AuthProvider>
  );
}
