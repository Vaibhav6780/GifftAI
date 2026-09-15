import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">This page doesn't exist.</p>
      <Link to="/">
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
