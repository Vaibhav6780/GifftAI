import type { Prisma } from "@prisma/client";
import type { ListCompaniesQuery } from "@gifftai/shared";
import { prisma } from "../../config/prisma";

const companyWithRelations = {
  owner: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.CompanyInclude;

export type CompanyWithRelations = Prisma.CompanyGetPayload<{ include: typeof companyWithRelations }>;

export const companiesRepository = {
  findById(id: string): Promise<CompanyWithRelations | null> {
    return prisma.company.findUnique({ where: { id }, include: companyWithRelations });
  },

  async list(query: ListCompaniesQuery): Promise<{ items: CompanyWithRelations[]; total: number }> {
    const where: Prisma.CompanyWhereInput = {
      ...(query.industry ? { industry: query.industry } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { domain: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: companyWithRelations,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.company.count({ where }),
    ]);

    return { items, total };
  },

  create(data: {
    name: string;
    domain?: string;
    industry?: string;
    size?: string;
    website?: string;
    phone?: string;
    description?: string;
    ownerId?: string | null;
  }): Promise<CompanyWithRelations> {
    return prisma.company.create({ data, include: companyWithRelations });
  },

  update(
    id: string,
    data: {
      name?: string;
      domain?: string | null;
      industry?: string | null;
      size?: string | null;
      website?: string | null;
      phone?: string | null;
      description?: string | null;
      ownerId?: string | null;
    },
  ): Promise<CompanyWithRelations> {
    return prisma.company.update({ where: { id }, data, include: companyWithRelations });
  },

  delete(id: string) {
    return prisma.company.delete({ where: { id } });
  },

  ownerExists(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  async relatedCounts(id: string): Promise<{ employees: number; deals: number }> {
    const [employees, deals] = await Promise.all([
      prisma.contact.count({ where: { companyId: id } }),
      prisma.deal.count({ where: { companyId: id } }),
    ]);
    return { employees, deals };
  },
};
