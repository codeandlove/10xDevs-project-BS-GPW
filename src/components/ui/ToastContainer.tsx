/**
 * Toast Container Component
 * Renders toast notifications
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { useToast, type Toast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end justify-end gap-2 p-4 sm:p-6"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>,
    document.body
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getColorClasses = () => {
    switch (toast.type) {
      case "success":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "info":
      default:
        return "border-blue-200 bg-blue-50";
    }
  };

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm transform transition-all duration-300 ${
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
      role="alert"
    >
      <div className={`rounded-lg border shadow-lg ${getColorClasses()}`}>
        <div className="flex items-start gap-3 p-4">
          <div className="shrink-0">{getIcon()}</div>

          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.message && <p className="text-sm opacity-90">{toast.message}</p>}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleDismiss}
            aria-label="Zamknij powiadomienie"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
