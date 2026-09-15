import type {
  ContactDetail,
  ContactSummary,
  CreateContactInput,
  ListContactsQuery,
  PaginatedResult,
  UpdateContactInput,
} from "@gifftai/shared";
import { contactsRepository, type ContactWithRelations } from "./contacts.repository";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";
import type { RequestMeta } from "../../lib/requestMeta";

function toSummary(contact: ContactWithRelations): ContactSummary {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    jobTitle: contact.jobTitle,
    kycStatus: contact.kycStatus,
    companyId: contact.companyId,
    companyName: contact.company?.name ?? null,
    ownerId: contact.ownerId,
    ownerName: contact.owner ? `${contact.owner.firstName} ${contact.owner.lastName}` : null,
    createdAt: contact.createdAt.toISOString(),
  };
}

function toDetail(contact: ContactWithRelations): ContactDetail {
  return {
    ...toSummary(contact),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

async function assertCompanyExists(companyId: string): Promise<void> {
  if (!(await contactsRepository.companyExists(companyId))) {
    throw AppError.badRequest("Company does not exist");
  }
}

async function assertOwnerExists(ownerId: string): Promise<void> {
  if (!(await contactsRepository.ownerExists(ownerId))) {
    throw AppError.badRequest("Owner does not exist");
  }
}

export const contactsService = {
  async list(query: ListContactsQuery): Promise<PaginatedResult<ContactSummary>> {
    const { items, total } = await contactsRepository.list(query);
    return {
      items: items.map(toSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async getById(id: string): Promise<ContactDetail> {
    const contact = await contactsRepository.findById(id);
    if (!contact) throw AppError.notFound("Contact not found");
    return toDetail(contact);
  },

  async create(input: CreateContactInput, actorId: string, meta: RequestMeta): Promise<ContactDetail> {
    if (input.companyId) await assertCompanyExists(input.companyId);
    if (input.ownerId) await assertOwnerExists(input.ownerId);

    const contact = await contactsRepository.create(input);
    await writeAuditLog({
      userId: actorId,
      action: "contact.create",
      entityType: "Contact",
      entityId: contact.id,
      newValue: input,
      ...meta,
    });

    return toDetail(contact);
  },

  async update(id: string, input: UpdateContactInput, actorId: string, meta: RequestMeta): Promise<ContactDetail> {
    const existing = await contactsRepository.findById(id);
    if (!existing) throw AppError.notFound("Contact not found");

    if (input.companyId) await assertCompanyExists(input.companyId);
    if (input.ownerId) await assertOwnerExists(input.ownerId);

    const updated = await contactsRepository.update(id, input);
    await writeAuditLog({
      userId: actorId,
      action: "contact.update",
      entityType: "Contact",
      entityId: id,
      newValue: input,
      ...meta,
    });

    return toDetail(updated);
  },

  async remove(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const existing = await contactsRepository.findById(id);
    if (!existing) throw AppError.notFound("Contact not found");

    await contactsRepository.delete(id);
    await writeAuditLog({
      userId: actorId,
      action: "contact.delete",
      entityType: "Contact",
      entityId: id,
      oldValue: { firstName: existing.firstName, lastName: existing.lastName },
      ...meta,
    });
  },
};
