import type { LeadSourceOption } from "@gifftai/shared";
import { leadSourcesRepository } from "./lead-sources.repository";

export const leadSourcesService = {
  async list(): Promise<LeadSourceOption[]> {
    const sources = await leadSourcesRepository.list();
    return sources.map((s) => ({ id: s.id, name: s.name }));
  },
};
