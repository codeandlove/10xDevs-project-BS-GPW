/**
 * Forgot Password Form
 * User enters email to receive password reset link
 */

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/db/supabase.client";
import { useToast } from "@/contexts/ToastContext";

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Proszę podać prawidłowy adres email"),
});

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate input
    const result = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      // Success
      setSuccess(true);
      setEmail("");
      toast.success("Email wysłany!", "Sprawdź swoją skrzynkę pocztową i kliknij link, aby zresetować hasło.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Nie udało się wysłać emaila. Spróbuj ponownie.";
      toast.error("Wystąpił błąd", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div role="alert" className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          <p className="font-medium">Email wysłany!</p>
          <p className="mt-1">Sprawdź swoją skrzynkę pocztową i kliknij link, aby zresetować hasło.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-8 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
            aria-describedby={validationError ? "email-error" : undefined}
            aria-invalid={!!validationError}
            className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
              validationError ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="twoj@email.com"
            disabled={isLoading}
          />
          {validationError && (
            <div id="email-error" role="alert" className="mt-1 text-sm text-red-600">
              {validationError}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Wysyłanie..." : "Wyślij link resetujący"}
        </Button>
      </form>
    </div>
  );
}
