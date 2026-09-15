import { useQuery } from "@tanstack/react-query";
import type { PermissionCatalogGroup } from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["permissions", "catalog"],
    queryFn: () => unwrap<PermissionCatalogGroup[]>(apiClient.get("/permissions")),
    staleTime: 5 * 60_000,
  });
}
