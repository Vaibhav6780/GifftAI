import { prisma } from "../../config/prisma";

export const dashboardRepository = {
  async countsByStatus(): Promise<{ status: string; count: number }[]> {
    const rows = await prisma.lead.groupBy({ by: ["status"], _count: true });
    return rows.map((row) => ({ status: row.status, count: row._count }));
  },

  async countsBySource(): Promise<{ sourceId: string | null; sourceName: string; count: number }[]> {
    const [rows, sources] = await Promise.all([
      prisma.lead.groupBy({ by: ["sourceId"], _count: true }),
      prisma.leadSource.findMany({ select: { id: true, name: true } }),
    ]);

    const nameById = new Map(sources.map((source) => [source.id, source.name]));

    return rows
      .map((row) => ({
        sourceId: row.sourceId,
        sourceName: row.sourceId ? (nameById.get(row.sourceId) ?? "Unknown source") : "No source",
        count: row._count,
      }))
      .sort((a, b) => b.count - a.count);
  },
};
