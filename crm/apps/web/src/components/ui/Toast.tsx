import { create } from "zustand";
import clsx from "clsx";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  dismissing?: boolean;
}

/** Matches the CSS `--animate-toast-out` duration in styles/globals.css — the item stays
 *  mounted (with the exit animation applied) for this long before it's actually removed,
 *  so dismissing a toast slides it out instead of popping it away instantly. */
const DISMISS_ANIMATION_MS = 200;

interface ToastState {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
  remove: (id: string) => void;
  push: (message: string, variant: ToastVariant) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, dismissing: true } : t)) }));
    setTimeout(() => useToastStore.getState().remove(id), DISMISS_ANIMATION_MS);
  },
  push: (message, variant) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => useToastStore.getState().dismiss(id), 5000);
  },
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push(message, "success"),
  error: (message: string) => useToastStore.getState().push(message, "error"),
  info: (message: string) => useToastStore.getState().push(message, "info"),
};

const variantClasses: Record<ToastVariant, string> = {
  success: "bg-emerald-600",
  error: "bg-red-600",
  info: "bg-slate-800",
};

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={clsx(
            "pointer-events-auto min-w-64 max-w-sm cursor-pointer rounded-lg px-4 py-3 text-sm text-white shadow-lg",
            "motion-reduce:animate-none",
            t.dismissing ? "animate-toast-out" : "animate-toast-in",
            variantClasses[t.variant],
          )}
          onClick={() => dismiss(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
