/**
 * Error Boundary component
 * Catches errors in component tree and displays fallback UI
 */

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // TODO: Log error to error tracking service (e.g., Sentry)
    // For now, silently catch - error is displayed in UI
    void error;
    void errorInfo;
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 text-6xl">⚠️</div>
          <h2 className="mb-2 text-2xl font-bold">Coś poszło nie tak</h2>
          <p className="mb-4 max-w-md text-muted-foreground">
            Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę lub skontaktuj się z pomocą techniczną, jeśli problem
            się powtarza.
          </p>
          {this.state.error && (
            <details className="mb-4 max-w-md text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Szczegóły błędu
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{this.state.error.message}</pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="default">
              Spróbuj ponownie
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Wróć do strony głównej
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for Error Boundary with custom fallback
 */
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType<ErrorFallbackProps>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary
        fallback={
          FallbackComponent ? (
            <FallbackComponent error={new Error("Component error")} resetError={() => window.location.reload()} />
          ) : undefined
        }
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
