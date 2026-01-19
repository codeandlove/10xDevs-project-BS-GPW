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
}

function AppLayoutContent({ children, header, showSubscriptionBanner = true }: AppLayoutProps) {
  const { profile } = useAuth();

  const handleUpgrade = () => {
    // TODO: Redirect to checkout or portal
    window.location.href = "/checkout";
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {header}
      {showSubscriptionBanner && profile && <SubscriptionBanner profile={profile} onUpgrade={handleUpgrade} />}
      <main className="flex-1 overflow-hidden">{children}</main>
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
