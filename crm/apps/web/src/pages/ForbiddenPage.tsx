import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function ForbiddenPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Access denied</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You don't have permission to view this page.
        </p>
      </div>
      <Card className="flex items-center justify-between p-6 text-sm text-slate-500 dark:text-slate-400">
        <span>Ask an administrator to grant you the required permission if you believe this is a mistake.</span>
        <Link to="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
