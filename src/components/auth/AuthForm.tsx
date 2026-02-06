/**
 * Auth form component for login and registration
 * Uses Supabase Auth
 */

import { useState, useMemo } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/db/supabase.client";
import { useToast } from "@/contexts/ToastContext";
import { PasswordStrengthIndicator, type PasswordStrength } from "./PasswordStrengthIndicator";
import { PasswordRequirements } from "./PasswordRequirements";

/**
 * Configuration: Email confirmation requirement
 * Set to true to redirect users to /auth/confirmation after registration
 * Set to false to redirect users directly to the app after registration
 */
const NEEDS_CONFIRM_EMAIL = true;

/**
 * Configuration: Password Requirements
 * Customize password character class requirements here
 */
const PASSWORD_CONFIG = {
  minLength: 6,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  minClassesRequired: 3,
};

/**
 * Helper: Check if password meets character class requirements
 */
function checkPasswordClasses(password: string): {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  classesCount: number;
} {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(password);

  const classesCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length;

  return {
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecialChars,
    classesCount,
  };
}

/**
 * Helper: Calculate password strength
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return null;

  const { classesCount } = checkPasswordClasses(password);
  const length = password.length;

  if (length >= 12 && classesCount === 4) return "strong";
  if (length >= 8 && classesCount >= 3) return "medium";
  if (length >= PASSWORD_CONFIG.minLength && classesCount >= PASSWORD_CONFIG.minClassesRequired) {
    return "weak";
  }

  return null;
}

interface AuthFormProps {
  mode: "login" | "register";
  returnUrl?: string;
}

/**
 * Create validation schema based on mode
 */
const createAuthSchema = (mode: "login" | "register") => {
  const baseSchema = {
    email: z.string().email("Nieprawidłowy adres email"),
    password:
      mode === "login"
        ? z.string().min(1, "Hasło jest wymagane")
        : z.string().min(PASSWORD_CONFIG.minLength, `Hasło musi mieć minimum ${PASSWORD_CONFIG.minLength} znaków`),
  };

  if (mode === "register") {
    return z
      .object({
        ...baseSchema,
        confirmPassword: z.string().min(1, "Potwierdź hasło"),
      })
      .refine(
        (data) => {
          const { classesCount, hasUppercase, hasLowercase, hasNumbers, hasSpecialChars } = checkPasswordClasses(
            data.password
          );

          return (
            classesCount >= PASSWORD_CONFIG.minClassesRequired &&
            (!PASSWORD_CONFIG.requireUppercase || hasUppercase) &&
            (!PASSWORD_CONFIG.requireLowercase || hasLowercase) &&
            (!PASSWORD_CONFIG.requireNumbers || hasNumbers) &&
            (!PASSWORD_CONFIG.requireSpecialChars || hasSpecialChars)
          );
        },
        {
          message: `Hasło musi zawierać co najmniej ${PASSWORD_CONFIG.minClassesRequired} z następujących: wielkie litery, małe litery, cyfry${PASSWORD_CONFIG.requireSpecialChars ? ", znaki specjalne" : ""}`,
          path: ["password"],
        }
      )
      .refine((data) => data.password === data.confirmPassword, {
        message: "Hasła nie są identyczne",
        path: ["confirmPassword"],
      });
  }

  return z.object(baseSchema);
};

export function AuthForm({ mode, returnUrl = "/grid" }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const toast = useToast();

  const passwordStrength = useMemo(() => {
    if (mode !== "register") return null;
    return calculatePasswordStrength(password);
  }, [password, mode]);

  const passwordRequirements = useMemo(() => {
    if (mode !== "register") return [];

    const { hasUppercase, hasLowercase, hasNumbers, hasSpecialChars } = checkPasswordClasses(password);
    const meetsLength = password.length >= PASSWORD_CONFIG.minLength;

    const requirements = [
      {
        label: `Co najmniej ${PASSWORD_CONFIG.minLength} znaków`,
        met: meetsLength,
      },
    ];

    if (PASSWORD_CONFIG.requireUppercase) {
      requirements.push({
        label: "Wielkie litery (A-Z)",
        met: hasUppercase,
      });
    }

    if (PASSWORD_CONFIG.requireLowercase) {
      requirements.push({
        label: "Małe litery (a-z)",
        met: hasLowercase,
      });
    }

    if (PASSWORD_CONFIG.requireNumbers) {
      requirements.push({
        label: "Cyfry (0-9)",
        met: hasNumbers,
      });
    }

    if (PASSWORD_CONFIG.requireSpecialChars) {
      requirements.push({
        label: "Znaki specjalne (!@#$%...)",
        met: hasSpecialChars,
      });
    }

    return requirements;
  }, [password, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validate input
    const schema = createAuthSchema(mode);
    const dataToValidate = mode === "register" ? { email, password, confirmPassword } : { email, password };
    const result = schema.safeParse(dataToValidate);
    if (!result.success) {
      const errors: { email?: string; password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") errors.email = err.message;
        if (err.path[0] === "password") errors.password = err.message;
        if (err.path[0] === "confirmPassword") errors.confirmPassword = err.message;
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
          // Initialize user with trial (always, before email confirmation)
          // This prevents multiple initialization attempts for the same user
          const initResponse = await fetch("/api/users/initialize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              auth_uid: data.user.id,
              email: data.user.email,
            }),
          });

          if (!initResponse.ok) {
            const errorData = await initResponse.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(errorData.error || errorData.message || "Failed to initialize user profile");
          }

          // Check if we should show email confirmation page
          if (NEEDS_CONFIRM_EMAIL) {
            // Redirect to confirmation page
            toast.success("Konto utworzone!", "Sprawdź swoją skrzynkę email i potwierdź adres, aby móc się zalogować.");

            setTimeout(() => {
              window.location.href = "/auth/confirmation";
            }, 1500);
          } else {
            // Direct access - redirect to app
            toast.success("Konto utworzone!", "Witaj w Black Swan Grid. Twój 7-dniowy trial właśnie się rozpoczął.");

            setTimeout(() => {
              window.location.href = returnUrl;
            }, 1000);
          }
        }
      } else {
        // Login existing user
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił błąd podczas uwierzytelniania";
      setError(errorMessage);
      toast.error("Błąd uwierzytelniania", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
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
            name="password"
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
            aria-describedby={
              mode === "register"
                ? validationErrors.password
                  ? "password-error password-requirements"
                  : "password-requirements"
                : validationErrors.password
                  ? "password-error"
                  : undefined
            }
          />
          {validationErrors.password && (
            <p id="password-error" className="mt-1 text-xs text-red-600">
              {validationErrors.password}
            </p>
          )}
          {mode === "register" && password && (
            <div id="password-requirements">
              <PasswordRequirements requirements={passwordRequirements} />
              <PasswordStrengthIndicator strength={passwordStrength} />
            </div>
          )}
        </div>

        {/* Confirm Password field - register mode only */}
        {mode === "register" && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium">
              Potwierdź hasło
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
                validationErrors.confirmPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              disabled={isLoading}
              aria-invalid={!!validationErrors.confirmPassword}
              aria-describedby={validationErrors.confirmPassword ? "confirmPassword-error" : undefined}
            />
            {validationErrors.confirmPassword && (
              <p id="confirmPassword-error" className="mt-1 text-xs text-red-600">
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>
        )}

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
            <a href="/auth/forgot-password" className="text-xs text-muted-foreground hover:underline">
              Zapomniałeś hasła?
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
