/**
 * Auth Page Wrapper
 * Wraps AuthForm with ToastProvider to ensure context is available
 */

import { ToastProvider } from "@/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AuthForm } from "./AuthForm";

interface AuthPageWrapperProps {
  mode: "login" | "register";
  returnUrl: string;
}

export function AuthPageWrapper({ mode, returnUrl }: AuthPageWrapperProps) {
  return (
    <ToastProvider>
      <AuthForm mode={mode} returnUrl={returnUrl} />
      <ToastContainer />
    </ToastProvider>
  );
}
