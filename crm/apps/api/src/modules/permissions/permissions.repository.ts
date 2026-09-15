import { prisma } from "../../config/prisma";

export const permissionsRepository = {
  list() {
    return prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
  },
};
