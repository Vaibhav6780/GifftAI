import { PrismaClient, TicketPriority } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { PERMISSIONS, ROLES, type RoleName } from "@gifftai/shared";

const prisma = new PrismaClient();

/** Permission keys granted to each system role. "*" means every catalog permission. */
const ROLE_PERMISSION_MAP: Record<RoleName, string[] | "*"> = {
  [ROLES.SUPER_ADMIN]: "*",
  [ROLES.ADMIN]: PERMISSIONS.filter(
    (p) =>
      p !== "settings:manage" &&
      p !== "audit:read" &&
      p !== "attendance_requests:approve" &&
      p !== "users:delete_permanent" &&
      p !== "daily_reports:read" &&
      // Excluded from Admin's wildcard grant so Tickets Overview is Super-Admin-only
      // by default (same convention as audit:read above) — the Support Agent role
      // below keeps its own explicit tickets:read grant, since that's the team
      // actually meant to work tickets day to day. Grantable to Admin later via the
      // Roles UI if needed.
      p !== "tickets:read" &&
      // RM Requests surfaces real fund movement on gifftai.com (RM Funding Requests'
      // two-admin approve→credit flow) — Super Admin only by default, same convention
      // as audit:read/daily_reports:read above.
      p !== "rm_requests:read" &&
      p !== "rm_requests:manage" &&
      // Blog / CMS proxies gifftai.com's admin API and publishes to the public marketing
      // site — Super Admin only by default (grant to a marketing-style role via the Roles
      // UI as needed), same convention as rm_requests above.
      p !== "blog:read" &&
      p !== "blog:manage",
  ),
  [ROLES.SALES_MANAGER]: PERMISSIONS.filter((p) =>
    [
      "leads",
      "contacts",
      "companies",
      "deals",
      "tasks",
      "calendar",
      "documents",
    ].some((module) => p.startsWith(`${module}:`)),
  ).concat(["reports:read", "analytics:read", "leads:import", "leads:export", "leads:assign", "deals:manage_pipeline"]),
  [ROLES.SALES_REP]: [
    "leads:read",
    "leads:create",
    "leads:update",
    "contacts:read",
    "contacts:create",
    "contacts:update",
    "companies:read",
    "deals:read",
    "deals:create",
    "deals:update",
    "tasks:create",
    "tasks:read",
    "tasks:update",
    "tasks:delete",
    "calendar:create",
    "calendar:read",
    "calendar:update",
    "calendar:delete",
  ],
  [ROLES.SUPPORT_AGENT]: [
    "tickets:create",
    "tickets:read",
    "tickets:update",
    "tickets:delete",
    "conversations:create",
    "conversations:read",
    "conversations:update",
    "conversations:delete",
    "contacts:read",
    "tasks:create",
    "tasks:read",
    "tasks:update",
    "calendar:read",
    "knowledge_base:read",
    "mail:read",
    "mail:send",
  ],
};

async function seedPermissionsAndRoles() {
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((key) => {
      const [module, action] = key.split(":");
      return prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, module: module ?? key, action: action ?? "manage" },
      });
    }),
  );
  const permissionIdByKey = new Map(permissionRecords.map((p) => [p.key, p.id]));

  for (const [name, keys] of Object.entries(ROLE_PERMISSION_MAP) as [RoleName, string[] | "*"][]) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, isSystem: true, description: `${name} (system role)` },
    });

    const grantedKeys = keys === "*" ? PERMISSIONS : keys;
    for (const key of grantedKeys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  console.log(`Seeded ${permissionRecords.length} permissions and ${Object.keys(ROLE_PERMISSION_MAP).length} roles.`);
}

async function seedDepartmentAndSuperAdmin() {
  const department = await prisma.department.upsert({
    where: { id: "seed-department-executive" },
    update: {},
    create: { id: "seed-department-executive", name: "Executive" },
  });

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLES.SUPER_ADMIN } });

  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@gifftai-crm.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super Admin already exists (${email}), skipping credential creation.`);
    return;
  }

  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      status: "ACTIVE",
      isEmailVerified: true,
      departmentId: department.id,
    },
  });

  await prisma.userRole.create({ data: { userId: user.id, roleId: superAdminRole.id } });

  console.log("──────────────────────────────────────────────");
  console.log(" Seeded Super Admin credentials (dev only):");
  console.log(`   email:    ${email}`);
  console.log(`   password: ${password}`);
  console.log("──────────────────────────────────────────────");
}

async function seedPipeline() {
  const existing = await prisma.pipeline.findFirst({ where: { isDefault: true } });
  if (existing) return;

  await prisma.pipeline.create({
    data: {
      name: "Sales Pipeline",
      isDefault: true,
      stages: {
        create: [
          { name: "New", order: 0, probability: 10 },
          { name: "Qualified", order: 1, probability: 25 },
          { name: "Proposal", order: 2, probability: 50 },
          { name: "Negotiation", order: 3, probability: 75 },
          { name: "Closed Won", order: 4, probability: 100, isWon: true },
          { name: "Closed Lost", order: 5, probability: 0, isLost: true },
        ],
      },
    },
  });
  console.log("Seeded default Sales Pipeline with 6 stages.");
}

async function seedLeadSources() {
  const sources = [
    "Website",
    "Referral",
    "Cold Call",
    "Email Campaign",
    "Social Media",
    "Trade Show",
    "Other",
    "Instagram",
    "WhatsApp",
    "LinkedIn",
    "Telegram",
  ];
  for (const name of sources) {
    await prisma.leadSource.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Seeded ${sources.length} lead sources.`);
}

/**
 * System account used as Attachment.uploadedById for files ingested automatically by the
 * lead-ingestion pipeline (no human uploader exists for those). INACTIVE so it can never
 * log in and is easy to recognize as non-human in the Users admin list.
 */
export const SYSTEM_USER_EMAIL = "system@gifftai-crm.local";

async function seedSystemUser() {
  const existing = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("base64url"), 12);
  await prisma.user.create({
    data: {
      email: SYSTEM_USER_EMAIL,
      passwordHash,
      firstName: "System",
      lastName: "Ingestion",
      status: "INACTIVE",
      isEmailVerified: true,
    },
  });
  console.log(`Seeded system user (${SYSTEM_USER_EMAIL}) for automated lead ingestion.`);
}

async function seedTicketCategoriesAndSla() {
  const categories = ["General", "Billing", "Technical", "Feature Request"];
  for (const name of categories) {
    await prisma.ticketCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  const slaDefaults: { priority: TicketPriority; name: string; firstResponseMinutes: number; resolutionMinutes: number }[] = [
    { priority: "URGENT", name: "Urgent SLA", firstResponseMinutes: 30, resolutionMinutes: 4 * 60 },
    { priority: "HIGH", name: "High SLA", firstResponseMinutes: 60, resolutionMinutes: 8 * 60 },
    { priority: "MEDIUM", name: "Medium SLA", firstResponseMinutes: 4 * 60, resolutionMinutes: 24 * 60 },
    { priority: "LOW", name: "Low SLA", firstResponseMinutes: 8 * 60, resolutionMinutes: 72 * 60 },
  ];

  for (const sla of slaDefaults) {
    const existing = await prisma.sLAPolicy.findFirst({ where: { priority: sla.priority } });
    if (existing) continue;
    await prisma.sLAPolicy.create({ data: sla });
  }

  console.log(`Seeded ${categories.length} ticket categories and ${slaDefaults.length} SLA policies.`);
}

async function seedKnowledgeBase() {
  const existing = await prisma.kbCategory.findFirst({ where: { name: "Getting Started" } });
  if (existing) return;
  await prisma.kbCategory.create({ data: { name: "Getting Started" } });
  console.log("Seeded default knowledge base category.");
}

async function main() {
  await seedPermissionsAndRoles();
  await seedDepartmentAndSuperAdmin();
  await seedPipeline();
  await seedLeadSources();
  await seedSystemUser();
  await seedTicketCategoriesAndSla();
  await seedKnowledgeBase();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
