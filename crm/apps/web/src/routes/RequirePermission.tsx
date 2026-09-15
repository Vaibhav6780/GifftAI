import { Outlet } from "react-router-dom";
import type { PermissionKey } from "@gifftai/shared";
import { useHasPermission } from "../hooks/usePermission";
import { ForbiddenPage } from "../pages/ForbiddenPage";

export function RequirePermission({ permissions }: { permissions: PermissionKey[] }) {
  const allowed = useHasPermission(...permissions);

  if (!allowed) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
}
