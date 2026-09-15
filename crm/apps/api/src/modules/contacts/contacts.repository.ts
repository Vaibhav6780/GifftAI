import type { Prisma } from "@prisma/client";
import type { ListContactsQuery } from "@gifftai/shared";
import { prisma } from "../../config/prisma";

const contactWithRelations = {
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ContactInclude;

export type ContactWithRelations = Prisma.ContactGetPayload<{ include: typeof contactWithRelations }>;

export const contactsRepository = {
  findById(id: string): Promise<ContactWithRelations | null> {
    return prisma.contact.findUnique({ where: { id }, include: contactWithRelations });
  },

  async list(query: ListContactsQuery): Promise<{ items: ContactWithRelations[]; total: number }> {
    const where: Prisma.ContactWhereInput = {
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.kycStatus ? { kycStatus: query.kycStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: contactWithRelations,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.contact.count({ where }),
    ]);

    return { items, total };
  },

  create(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    kycStatus?: Prisma.ContactCreateInput["kycStatus"];
    companyId?: string | null;
    ownerId?: string | null;
  }): Promise<ContactWithRelations> {
    return prisma.contact.create({ data, include: contactWithRelations });
  },

  update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      jobTitle?: string | null;
      kycStatus?: Prisma.ContactUpdateInput["kycStatus"];
      companyId?: string | null;
      ownerId?: string | null;
    },
  ): Promise<ContactWithRelations> {
    return prisma.contact.update({ where: { id }, data, include: contactWithRelations });
  },

  delete(id: string) {
    return prisma.contact.delete({ where: { id } });
  },

  companyExists(id: string) {
    return prisma.company.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  ownerExists(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },
};
