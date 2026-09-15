import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LeadDetail } from "@gifftai/shared";
import type * as LeadIngestionRepositoryModule from "./lead-ingestion.repository";
import { leadIngestionService } from "./lead-ingestion.service";

const { repo, fakeTx, getByIdMock } = vi.hoisted(() => ({
  repo: {
    resolveLeadSourceId: vi.fn(async () => "source-1"),
    findLeadIdByExternalIdentity: vi.fn(async () => null as string | null),
    findLeadIdByEmailOrPhone: vi.fn(async () => null as string | null),
    createLead: vi.fn(async () => ({ id: "lead-new" })),
    patchLeadNullFieldsOnly: vi.fn(async () => false),
    upsertExternalIdentity: vi.fn(async () => ({ isNew: true })),
    resolveChannelId: vi.fn(async () => "channel-1" as string | null),
    upsertConversation: vi.fn(async () => ({ id: "conversation-1" })),
    upsertMessage: vi.fn(async () => ({ message: { id: "message-1" }, isNew: true })),
    createAttachment: vi.fn(async () => undefined),
    createActivity: vi.fn(async () => undefined),
  },
  fakeTx: {} as unknown,
  getByIdMock: vi.fn(async (id: string) => ({ id, firstName: "Test" }) as unknown as LeadDetail),
}));

vi.mock("./lead-ingestion.repository", async () => {
  const actual = await vi.importActual<typeof LeadIngestionRepositoryModule>("./lead-ingestion.repository");
  return {
    leadIngestionRepository: repo,
    channelTypeForSource: actual.channelTypeForSource,
    prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn(fakeTx) },
  };
});

vi.mock("../../lib/systemUser", () => ({ getSystemUserId: vi.fn(async () => "system-user-id") }));
vi.mock("../../lib/s3Client", () => ({ uploadObject: vi.fn() }));
vi.mock("../leads/leads.service", () => ({ leadsService: { getById: getByIdMock } }));

describe("leadIngestionService.ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.resolveLeadSourceId.mockResolvedValue("source-1");
    repo.findLeadIdByExternalIdentity.mockResolvedValue(null);
    repo.findLeadIdByEmailOrPhone.mockResolvedValue(null);
    repo.createLead.mockResolvedValue({ id: "lead-new" });
    repo.resolveChannelId.mockResolvedValue("channel-1");
    repo.upsertConversation.mockResolvedValue({ id: "conversation-1" });
    getByIdMock.mockImplementation(async (id: string) => ({ id, firstName: "Test" }) as unknown as LeadDetail);
  });

  it("creates a new lead when no existing identity or contact match is found", async () => {
    const result = await leadIngestionService.ingest({
      source: "WEBSITE",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      message: "Interested in your product",
      occurredAt: new Date(),
    });

    expect(repo.createLead).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(true);
    expect(result.lead.id).toBe("lead-new");
    // WEBSITE has no ChannelType mapping — conversation/message linkage must be skipped.
    expect(repo.resolveChannelId).not.toHaveBeenCalled();
    expect(repo.upsertConversation).not.toHaveBeenCalled();
  });

  it("dedupes by email across sources instead of creating a second lead", async () => {
    repo.findLeadIdByEmailOrPhone.mockResolvedValue("lead-existing");

    const result = await leadIngestionService.ingest({
      source: "WEBSITE",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      occurredAt: new Date(),
    });

    expect(repo.createLead).not.toHaveBeenCalled();
    expect(result.created).toBe(false);
    expect(result.lead.id).toBe("lead-existing");
    expect(repo.patchLeadNullFieldsOnly).toHaveBeenCalledWith(fakeTx, "lead-existing", expect.objectContaining({ email: "ada@example.com" }));
  });

  it("dedupes by (channelType, externalUserId) for messaging sources", async () => {
    repo.findLeadIdByExternalIdentity.mockResolvedValue("lead-telegram-1");

    const result = await leadIngestionService.ingest({
      source: "TELEGRAM",
      externalUserId: "12345",
      externalConversationId: "chat-12345",
      username: "adalovelace",
      message: "Hello!",
      occurredAt: new Date(),
    });

    expect(repo.findLeadIdByExternalIdentity).toHaveBeenCalledWith(fakeTx, "TELEGRAM", "12345");
    expect(repo.createLead).not.toHaveBeenCalled();
    expect(result.created).toBe(false);
    expect(repo.upsertConversation).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ channelId: "channel-1", leadId: "lead-telegram-1", externalConversationId: "chat-12345" }),
    );
    expect(repo.upsertMessage).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ conversationId: "conversation-1", body: "Hello!" }),
    );
  });

  it("skips conversation linkage when the integration has no connected Channel", async () => {
    repo.resolveChannelId.mockResolvedValue(null);

    await leadIngestionService.ingest({
      source: "TELEGRAM",
      externalUserId: "999",
      externalConversationId: "chat-999",
      message: "Hi",
      occurredAt: new Date(),
    });

    expect(repo.upsertConversation).not.toHaveBeenCalled();
  });

  it("records an Activity entry with the source in its metadata", async () => {
    await leadIngestionService.ingest({
      source: "WHATSAPP",
      externalUserId: "+15551234567",
      email: "lead@example.com",
      message: "Need a quote",
      occurredAt: new Date(),
    });

    expect(repo.createActivity).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({
        type: "lead.ingested",
        metadata: expect.objectContaining({ source: "WHATSAPP", externalUserId: "+15551234567" }),
      }),
    );
  });

  it("skips the Activity write for a no-op backfill re-sync of an already-known contact", async () => {
    // Mirrors the hourly WhatsApp contacts sync: the contact already resolves to an existing
    // lead via its external identity, its fields are already populated (no patch), the
    // identity link already exists (not new), and contact rows carry no message/conversation.
    repo.findLeadIdByExternalIdentity.mockResolvedValue("lead-whatsapp-1");
    repo.patchLeadNullFieldsOnly.mockResolvedValue(false);
    repo.upsertExternalIdentity.mockResolvedValue({ isNew: false });

    const result = await leadIngestionService.ingest({
      source: "WHATSAPP",
      externalUserId: "+15551234567",
      phone: "+15551234567",
      firstName: "Ada",
      occurredAt: new Date(),
    });

    expect(result.created).toBe(false);
    expect(repo.upsertConversation).not.toHaveBeenCalled();
    expect(repo.createActivity).not.toHaveBeenCalled();
  });
});
