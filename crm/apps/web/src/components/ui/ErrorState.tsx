import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ description = "Something went wrong loading this data.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <AlertTriangle size={32} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
      <p className="font-medium text-slate-700 dark:text-slate-200">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
