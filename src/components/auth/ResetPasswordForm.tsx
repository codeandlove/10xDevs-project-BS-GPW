/**
 * Reset Password Form
 * User sets new password after clicking reset link from email
 */

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/db/supabase.client";
import { useToast } from "@/contexts/ToastContext";

// Validation schema
const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Hasła nie są identyczne",
    path: ["passwordConfirm"],
  });

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    password?: string;
    passwordConfirm?: string;
  }>({});
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validate input
    const result = resetPasswordSchema.safeParse({ password, passwordConfirm });
    if (!result.success) {
      const errors: { password?: string; passwordConfirm?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "password") errors.password = err.message;
        if (err.path[0] === "passwordConfirm") errors.passwordConfirm = err.message;
      });
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      // Success - redirect to login with success message
      toast.success("Hasło zmienione!", "Możesz teraz zalogować się używając nowego hasła.");

      // Redirect after short delay to show toast
      setTimeout(() => {
        window.location.href = "/auth/login?password_reset=success";
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Nie udało się zmienić hasła. Link mógł wygasnąć.";
      toast.error("Wystąpił błąd", errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-8 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Nowe hasło
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required="true"
            aria-describedby={validationErrors.password ? "password-error password-help" : "password-help"}
            aria-invalid={!!validationErrors.password}
            className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
              validationErrors.password ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Minimum 8 znaków"
            disabled={isLoading}
          />
          <p id="password-help" className="mt-1 text-xs text-gray-500">
            Minimum 8 znaków
          </p>
          {validationErrors.password && (
            <div id="password-error" role="alert" className="mt-1 text-sm text-red-600">
              {validationErrors.password}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="password-confirm" className="block text-sm font-medium text-gray-700 mb-2">
            Potwierdź hasło
          </label>
          <input
            type="password"
            id="password-confirm"
            name="password-confirm"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            aria-required="true"
            aria-describedby={validationErrors.passwordConfirm ? "password-confirm-error" : undefined}
            aria-invalid={!!validationErrors.passwordConfirm}
            className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
              validationErrors.passwordConfirm ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Powtórz hasło"
            disabled={isLoading}
          />
          {validationErrors.passwordConfirm && (
            <div id="password-confirm-error" role="alert" className="mt-1 text-sm text-red-600">
              {validationErrors.passwordConfirm}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Zmieniam hasło..." : "Zmień hasło"}
        </Button>
      </form>
    </div>
  );
}
