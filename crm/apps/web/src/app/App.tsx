import { AppRoutes } from "./router";
import { useMe } from "../features/auth/api";
import { Spinner } from "../components/ui/Spinner";

export function App() {
  const { isFetched } = useMe(true);

  if (!isFetched) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <Spinner />
      </div>
    );
  }

  return <AppRoutes />;
}
