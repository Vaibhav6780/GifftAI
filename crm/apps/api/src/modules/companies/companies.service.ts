import type {
  CompanyDetail,
  CompanySummary,
  CreateCompanyInput,
  ListCompaniesQuery,
  PaginatedResult,
  UpdateCompanyInput,
} from "@gifftai/shared";
import { companiesRepository, type CompanyWithRelations } from "./companies.repository";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";
import type { RequestMeta } from "../../lib/requestMeta";

function toSummary(company: CompanyWithRelations): CompanySummary {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    industry: company.industry,
    size: company.size,
    website: company.website,
    phone: company.phone,
    ownerId: company.ownerId,
    ownerName: company.owner ? `${company.owner.firstName} ${company.owner.lastName}` : null,
    createdAt: company.createdAt.toISOString(),
  };
}

function toDetail(company: CompanyWithRelations): CompanyDetail {
  return {
    ...toSummary(company),
    description: company.description,
    updatedAt: company.updatedAt.toISOString(),
  };
}

async function assertOwnerExists(ownerId: string): Promise<void> {
  if (!(await companiesRepository.ownerExists(ownerId))) {
    throw AppError.badRequest("Owner does not exist");
  }
}

export const companiesService = {
  async list(query: ListCompaniesQuery): Promise<PaginatedResult<CompanySummary>> {
    const { items, total } = await companiesRepository.list(query);
    return {
      items: items.map(toSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async getById(id: string): Promise<CompanyDetail> {
    const company = await companiesRepository.findById(id);
    if (!company) throw AppError.notFound("Company not found");
    return toDetail(company);
  },

  async create(input: CreateCompanyInput, actorId: string, meta: RequestMeta): Promise<CompanyDetail> {
    if (input.ownerId) await assertOwnerExists(input.ownerId);

    const company = await companiesRepository.create(input);
    await writeAuditLog({
      userId: actorId,
      action: "company.create",
      entityType: "Company",
      entityId: company.id,
      newValue: input,
      ...meta,
    });

    return toDetail(company);
  },

  async update(id: string, input: UpdateCompanyInput, actorId: string, meta: RequestMeta): Promise<CompanyDetail> {
    const existing = await companiesRepository.findById(id);
    if (!existing) throw AppError.notFound("Company not found");

    if (input.ownerId) await assertOwnerExists(input.ownerId);

    const updated = await companiesRepository.update(id, input);
    await writeAuditLog({
      userId: actorId,
      action: "company.update",
      entityType: "Company",
      entityId: id,
      newValue: input,
      ...meta,
    });

    return toDetail(updated);
  },

  async remove(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const existing = await companiesRepository.findById(id);
    if (!existing) throw AppError.notFound("Company not found");

    const { employees, deals } = await companiesRepository.relatedCounts(id);
    if (employees > 0 || deals > 0) {
      throw AppError.badRequest(
        `Cannot delete a company with ${employees} linked contact(s) and ${deals} linked deal(s) — reassign or remove them first.`,
      );
    }

    await companiesRepository.delete(id);
    await writeAuditLog({
      userId: actorId,
      action: "company.delete",
      entityType: "Company",
      entityId: id,
      oldValue: { name: existing.name },
      ...meta,
    });
  },
};
