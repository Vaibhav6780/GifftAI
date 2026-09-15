import { useQuery } from "@tanstack/react-query";
import type { AuditLogEntry, ListAuditLogQuery, PaginatedResult } from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

export function useAuditLogList(query: Partial<ListAuditLogQuery>) {
  return useQuery({
    queryKey: ["audit", query] as const,
    queryFn: () => unwrap<PaginatedResult<AuditLogEntry>>(apiClient.get("/audit", { params: query })),
  });
}

export function useAuditEntityTypes() {
  return useQuery({
    queryKey: ["audit", "entity-types"] as const,
    queryFn: () => unwrap<string[]>(apiClient.get("/audit/entity-types")),
    staleTime: 60_000,
  });
}
