/**
 * Auth form component for login and registration
 * Uses Supabase Auth
 */

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/db/supabase.client";
import { useToast } from "@/contexts/ToastContext";

interface AuthFormProps {
  mode: "login" | "register";
  returnUrl?: string;
}

// Validation schema
const authSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
});

export function AuthForm({ mode, returnUrl = "/grid" }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validate input
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") errors.email = err.message;
        if (err.path[0] === "password") errors.password = err.message;
      });
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "register") {
        // Register new user
        const { data, error: signUpError } = await supabaseClient.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Initialize user with trial
          await fetch("/api/users/initialize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              auth_uid: data.user.id,
              email: data.user.email,
            }),
          });

          toast.success("Konto utworzone!", "Witaj w Black Swan Grid. Twój 7-dniowy trial właśnie się rozpoczął.");

          // Redirect to grid
          setTimeout(() => {
            window.location.href = returnUrl;
          }, 1000);
        }
      } else {
        // Login existing user
        const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        toast.success("Zalogowano pomyślnie!", "Witaj ponownie.");

        // Redirect to return URL
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 1000);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const errorMessage = err.message || "Wystąpił błąd podczas uwierzytelniania";
      setError(errorMessage);
      toast.error("Błąd uwierzytelniania", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
              validationErrors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="twoj@email.pl"
            autoComplete="email"
            required
            disabled={isLoading}
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? "email-error" : undefined}
          />
          {validationErrors.email && (
            <p id="email-error" className="mt-1 text-xs text-red-600">
              {validationErrors.email}
            </p>
          )}
        </div>

        {/* Password field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Hasło
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
              validationErrors.password ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="••••••••"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            disabled={isLoading}
            aria-invalid={!!validationErrors.password}
            aria-describedby={validationErrors.password ? "password-error" : undefined}
          />
          {validationErrors.password && (
            <p id="password-error" className="mt-1 text-xs text-red-600">
              {validationErrors.password}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-red-50 p-3" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Ładowanie..." : mode === "register" ? "Zarejestruj się" : "Zaloguj się"}
        </Button>

        {/* Password reset link (login only) */}
        {mode === "login" && (
          <div className="text-center">
            <a href="/auth/reset-password" className="text-xs text-muted-foreground hover:underline">
              Zapomniałeś hasła?
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
