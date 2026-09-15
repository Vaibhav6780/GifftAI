import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{this.state.error.message}</p>
          <Button onClick={() => window.location.assign("/")}>Go home</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
