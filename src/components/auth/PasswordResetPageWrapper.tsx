/**
 * Password Reset Page Wrapper
 * Wraps password reset forms with ToastProvider and handles error state
 */

import { ToastProvider } from "@/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ResetPasswordForm } from "./ResetPasswordForm";

interface PasswordResetPageWrapperProps {
  mode: "forgot" | "reset";
  errorType?: string | null;
  errorDescription?: string | null;
}

export function PasswordResetPageWrapper({ mode, errorType, errorDescription }: PasswordResetPageWrapperProps) {
  // Handle reset password error state (expired/invalid token)
  if (mode === "reset" && errorType) {
    return (
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          <p className="font-medium">Link wygasł lub jest nieprawidłowy</p>
          <p className="mt-1">{errorDescription || "Link resetujący hasło jest już nieważny."}</p>
          <a href="/auth/forgot-password" className="mt-3 inline-block font-medium underline hover:no-underline">
            Wyślij nowy link resetujący
          </a>
        </div>
      </div>
    );
  }

  // Normal flow - render appropriate form
  return (
    <ToastProvider>
      {mode === "forgot" ? <ForgotPasswordForm /> : <ResetPasswordForm />}
      <ToastContainer />
    </ToastProvider>
  );
}
