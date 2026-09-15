import { useQuery } from "@tanstack/react-query";
import type { LeadSourceOption } from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["lead-sources"] as const;

export function useLeadSourcesList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => unwrap<LeadSourceOption[]>(apiClient.get("/lead-sources")),
  });
}
