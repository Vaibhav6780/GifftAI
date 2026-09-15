import { prisma } from "../../config/prisma";

export const leadSourcesRepository = {
  list() {
    return prisma.leadSource.findMany({ orderBy: { name: "asc" } });
  },
};
