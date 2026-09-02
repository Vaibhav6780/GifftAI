export type ProjectCategory =
  | "AI"
  | "SaaS"
  | "Web Apps"
  | "Mobile"
  | "CRM / ERP"
  | "FinTech"
  | "E-commerce"
  | "Dashboards"
  | "Automation";

export type ArchitectureLayer = {
  label: string;
  detail: string;
};

export type TechGroup = {
  group: "Frontend" | "Backend" | "Database" | "Cloud" | "AI" | "DevOps";
  items: string[];
};

export type Project = {
  slug: string;
  title: string;
  /** Primary category used for the case-study eyebrow. */
  category: ProjectCategory;
  /** All categories this project should appear under when filtering. */
  categories: ProjectCategory[];
  year: string;
  /** One-line description used on cards and the case-study hero. */
  description: string;
  /** Longer summary shown on the projects index card hover / detail intro. */
  summary: string;
  /** Visual treatment hint for the editorial portfolio layout. */
  layout: "feature" | "wide" | "split" | "panel";
  /** Accent-tinted preview key — drives the generated composition. */
  preview: "dashboard" | "browser" | "mobile" | "console" | "graph";
  technologies: string[];
  liveUrl?: string;
  challenge: string;
  solution: string;
  features: { title: string; body: string }[];
  architecture: ArchitectureLayer[];
  tech: TechGroup[];
  results: string[];
  gallery: { caption: string; preview: Project["preview"] }[];
};

export const projects: Project[] = [
  {
    slug: "atlas-operations-platform",
    title: "Atlas Operations Platform",
    category: "SaaS",
    categories: ["SaaS", "Dashboards", "Automation", "Web Apps"],
    year: "2025",
    description:
      "A single operating surface for logistics teams running high-volume, multi-site fulfilment.",
    summary:
      "Atlas replaces a stack of spreadsheets, email threads and disconnected tools with one real-time operations platform — planning, dispatch, exceptions and reporting in a single system.",
    layout: "feature",
    preview: "dashboard",
    technologies: ["Next.js", "TypeScript", "PostgreSQL", "Temporal", "AWS"],
    challenge:
      "Operations were coordinated across a dozen spreadsheets and three legacy tools that never agreed with each other. Every shift started with an hour of manual reconciliation, and exceptions were only discovered after they became customer problems.",
    solution:
      "We modelled the real dispatch workflow with the operations leads, then built a live planning board on top of an event-sourced core. Every status change flows through a single pipeline, so the board, the reports and the alerts are always looking at the same truth.",
    features: [
      {
        title: "Live planning board",
        body: "Drag-and-drop assignment with capacity, SLA and cost surfaced inline as decisions are made.",
      },
      {
        title: "Exception routing",
        body: "Rules engine detects at-risk jobs early and routes them to the right owner with full context.",
      },
      {
        title: "Operational reporting",
        body: "Shift, site and network views built from the same event stream that powers the board.",
      },
      {
        title: "Audit timeline",
        body: "Every job carries a complete, queryable history — who changed what, when and why.",
      },
    ],
    architecture: [
      { label: "Frontend", detail: "Next.js app router, streaming server components, real-time board over WebSockets" },
      { label: "API Layer", detail: "Typed RPC gateway, authz at the edge, request-level tracing" },
      { label: "Services", detail: "Planning, dispatch and reporting services coordinated by Temporal workflows" },
      { label: "Database", detail: "Event-sourced Postgres core with read models materialised per view" },
      { label: "External Integrations", detail: "Carrier APIs, telematics feeds and finance system sync" },
    ],
    tech: [
      { group: "Frontend", items: ["Next.js", "TypeScript", "Tailwind CSS", "TanStack Query"] },
      { group: "Backend", items: ["Node.js", "Temporal", "gRPC"] },
      { group: "Database", items: ["PostgreSQL", "Redis"] },
      { group: "Cloud", items: ["AWS ECS", "RDS", "CloudFront"] },
      { group: "DevOps", items: ["Terraform", "GitHub Actions", "OpenTelemetry"] },
    ],
    results: [
      "Shift planning consolidated into one system",
      "Exceptions surfaced before they reach customers",
      "Reporting drawn from a single source of truth",
      "Architecture that scales with new sites",
    ],
    gallery: [
      { caption: "Planning board — network view", preview: "dashboard" },
      { caption: "Exception routing queue", preview: "console" },
      { caption: "Shift performance reporting", preview: "graph" },
    ],
  },
  {
    slug: "ledgerline-payments",
    title: "Ledgerline Payments",
    category: "FinTech",
    categories: ["FinTech", "SaaS", "Web Apps", "Dashboards"],
    year: "2025",
    description:
      "A reconciliation and payouts engine for a marketplace moving money across borders.",
    summary:
      "Ledgerline ingests transactions from every payment provider the business uses, reconciles them against internal ledgers, and runs scheduled payouts with a full audit trail.",
    layout: "split",
    preview: "console",
    technologies: ["TypeScript", "Go", "PostgreSQL", "Kafka", "GCP"],
    challenge:
      "Money moved through four providers, each with its own file format, settlement timing and fee model. Reconciliation was a manual month-end exercise, and finance could not state with confidence that the books were correct.",
    solution:
      "We built a double-entry ledger as the system of record and normalised every provider into a single transaction model feeding it. Reconciliation runs continuously, and discrepancies are flagged the moment they appear rather than at month end.",
    features: [
      { title: "Provider normalisation", body: "Adapters translate each provider's data into one canonical transaction shape." },
      { title: "Double-entry ledger", body: "Immutable, balanced ledger that finance can trust as the source of record." },
      { title: "Continuous reconciliation", body: "Every inbound event is matched in near real time; breaks are raised immediately." },
      { title: "Scheduled payouts", body: "Configurable payout runs with approval gates and a complete audit history." },
    ],
    architecture: [
      { label: "Frontend", detail: "Operations console for reconciliation, payouts and audit review" },
      { label: "API Layer", detail: "Idempotent write API, signed webhooks, strict input validation" },
      { label: "Services", detail: "Ingestion, matching engine and payout scheduler communicating over Kafka" },
      { label: "Database", detail: "Append-only ledger in Postgres with partitioned transaction history" },
      { label: "External Integrations", detail: "Payment providers, banking rails and the data warehouse" },
    ],
    tech: [
      { group: "Frontend", items: ["React", "TypeScript", "Vite", "Tailwind CSS"] },
      { group: "Backend", items: ["Go", "Node.js", "Kafka"] },
      { group: "Database", items: ["PostgreSQL", "BigQuery"] },
      { group: "Cloud", items: ["GCP Cloud Run", "Pub/Sub", "Cloud SQL"] },
      { group: "DevOps", items: ["Terraform", "GitLab CI", "Grafana"] },
    ],
    results: [
      "Reconciliation moved from monthly to continuous",
      "One ledger finance can rely on",
      "Payout runs with enforced approval controls",
      "Clear path to add new providers",
    ],
    gallery: [
      { caption: "Reconciliation breaks queue", preview: "console" },
      { caption: "Ledger explorer", preview: "dashboard" },
      { caption: "Payout run detail", preview: "browser" },
    ],
  },
  {
    slug: "signal-support-copilot",
    title: "Signal Support Copilot",
    category: "AI",
    categories: ["AI", "Automation", "SaaS", "Web Apps"],
    year: "2025",
    description:
      "A retrieval-grounded assistant that drafts support replies from a company's own knowledge.",
    summary:
      "Signal reads the help centre, past tickets and product docs, then drafts grounded replies for agents to review — with citations, confidence and a clear handoff when it isn't sure.",
    layout: "wide",
    preview: "graph",
    technologies: ["Next.js", "Python", "pgvector", "LangGraph", "Azure"],
    challenge:
      "Support volume was growing faster than the team could hire. Off-the-shelf chatbots either hallucinated or deflected everything to a generic FAQ, and agents didn't trust them.",
    solution:
      "We built a retrieval pipeline over the company's own content with strict grounding: the assistant answers only from retrieved passages, always cites them, and routes low-confidence questions to a human agent together with the supporting material it has already gathered.",
    features: [
      { title: "Grounded drafting", body: "Replies are generated only from retrieved, cited source passages." },
      { title: "Confidence gating", body: "Low-confidence questions are escalated with context instead of guessed at." },
      { title: "Answer review loop", body: "Agent edits feed back into evaluation so quality is measured, not assumed." },
      { title: "Knowledge gaps report", body: "Surfaces the questions the knowledge base can't yet answer." },
    ],
    architecture: [
      { label: "Frontend", detail: "Agent console embedded in the existing helpdesk via extension" },
      { label: "API Layer", detail: "Streaming completion API with per-tenant rate limits and PII redaction" },
      { label: "Services", detail: "Ingestion, embedding, retrieval and a LangGraph orchestration layer" },
      { label: "Database", detail: "Postgres with pgvector for embeddings; document store for source content" },
      { label: "External Integrations", detail: "Helpdesk, knowledge base and model providers" },
    ],
    tech: [
      { group: "Frontend", items: ["Next.js", "TypeScript", "Tailwind CSS"] },
      { group: "Backend", items: ["Python", "FastAPI", "LangGraph"] },
      { group: "Database", items: ["PostgreSQL", "pgvector"] },
      { group: "Cloud", items: ["Azure Container Apps", "Blob Storage"] },
      { group: "AI", items: ["Claude", "OpenAI embeddings", "Ragas evals"] },
      { group: "DevOps", items: ["Bicep", "GitHub Actions", "Langfuse"] },
    ],
    results: [
      "Every answer traceable to a source",
      "Low-confidence questions escalated rather than answered speculatively",
      "Knowledge gaps made visible to the content team",
      "Evaluation built in from the outset",
    ],
    gallery: [
      { caption: "Draft with citations", preview: "graph" },
      { caption: "Escalation handoff view", preview: "console" },
      { caption: "Knowledge gap report", preview: "dashboard" },
    ],
  },
  {
    slug: "fieldkit-mobile",
    title: "FieldKit Mobile",
    category: "Mobile",
    categories: ["Mobile", "Web Apps", "Automation"],
    year: "2024",
    description:
      "An offline-first field app for inspection crews working where connectivity isn't guaranteed.",
    summary:
      "FieldKit lets crews capture structured inspections, photos and signatures offline, then sync cleanly when they're back in range — with a web back office for scheduling and review.",
    layout: "panel",
    preview: "mobile",
    technologies: ["React Native", "Expo", "SQLite", "TypeScript", "Node.js"],
    challenge:
      "Crews worked in basements, tunnels and rural sites with no signal. The existing app assumed connectivity, so data was lost, duplicated or re-keyed back at the office.",
    solution:
      "We designed the app offline-first: a local database is the primary store, and a conflict-aware sync engine reconciles with the server when a connection returns. The office sees results as soon as a device syncs.",
    features: [
      { title: "Offline capture", body: "Full inspection workflows, media and signatures work with no connection." },
      { title: "Conflict-aware sync", body: "Deterministic merge rules resolve edits made on multiple devices." },
      { title: "Back-office review", body: "Web app for scheduling, assignment and sign-off on completed work." },
      { title: "Media pipeline", body: "Photos are compressed and queued on-device, uploaded when bandwidth allows." },
    ],
    architecture: [
      { label: "Mobile", detail: "React Native (Expo), SQLite local store, background sync tasks" },
      { label: "API Layer", detail: "Sync endpoint with change-tracking, auth via short-lived tokens" },
      { label: "Services", detail: "Sync reconciliation, media processing and notification workers" },
      { label: "Database", detail: "PostgreSQL with per-record version vectors for merge" },
      { label: "External Integrations", detail: "Object storage for media, asset register sync" },
    ],
    tech: [
      { group: "Frontend", items: ["React Native", "Expo", "TypeScript", "React"] },
      { group: "Backend", items: ["Node.js", "Fastify"] },
      { group: "Database", items: ["SQLite", "PostgreSQL", "S3"] },
      { group: "Cloud", items: ["AWS", "Lambda", "CloudFront"] },
      { group: "DevOps", items: ["EAS", "GitHub Actions", "Sentry"] },
    ],
    results: [
      "Field data captured reliably without signal",
      "No more re-keying at the office",
      "Predictable sync crews can trust",
      "One review workflow for every site",
    ],
    gallery: [
      { caption: "Inspection capture flow", preview: "mobile" },
      { caption: "Sync status screen", preview: "mobile" },
      { caption: "Back-office scheduling", preview: "dashboard" },
    ],
  },
  {
    slug: "cadence-crm",
    title: "Cadence CRM",
    category: "CRM / ERP",
    categories: ["CRM / ERP", "SaaS", "Web Apps", "Automation"],
    year: "2024",
    description:
      "A workflow-shaped CRM for a services business whose process didn't fit off-the-shelf tools.",
    summary:
      "Cadence models the company's real pipeline — quoting, delivery, and renewals — with automation that removes the manual status-chasing that generic CRMs leave behind.",
    layout: "split",
    preview: "browser",
    technologies: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Vercel"],
    challenge:
      "The team had customised a generic CRM so heavily that no one trusted its data. Half the process ran in separate spreadsheets, and reporting was largely estimated.",
    solution:
      "We rebuilt the CRM around the actual stages the business works in, with automation for the repetitive transitions and a clean data model underneath. Reporting comes straight from the pipeline, not a monthly export.",
    features: [
      { title: "Process-shaped pipeline", body: "Stages, fields and permissions match how the business actually sells and delivers." },
      { title: "Transition automation", body: "Routine status changes, tasks and notifications happen without manual chasing." },
      { title: "Renewals engine", body: "Upcoming renewals are surfaced early with the context to act on them." },
      { title: "Live reporting", body: "Pipeline, forecast and delivery views built directly on the CRM data model." },
    ],
    architecture: [
      { label: "Frontend", detail: "Next.js app router, optimistic UI, role-aware layouts" },
      { label: "API Layer", detail: "Server actions and route handlers with field-level authz" },
      { label: "Services", detail: "Automation runner and scheduled jobs for renewals and digests" },
      { label: "Database", detail: "PostgreSQL via Prisma with a normalised, auditable schema" },
      { label: "External Integrations", detail: "Email, calendar and the finance/invoicing system" },
    ],
    tech: [
      { group: "Frontend", items: ["Next.js", "TypeScript", "Tailwind CSS", "Radix UI"] },
      { group: "Backend", items: ["Node.js", "Prisma", "Inngest"] },
      { group: "Database", items: ["PostgreSQL"] },
      { group: "Cloud", items: ["Vercel", "Neon", "Upstash"] },
      { group: "DevOps", items: ["GitHub Actions", "Checkly"] },
    ],
    results: [
      "One system the team relies on",
      "Manual status follow-up largely removed",
      "Renewals visible before they lapse",
      "Reporting drawn directly from the pipeline",
    ],
    gallery: [
      { caption: "Pipeline board", preview: "browser" },
      { caption: "Automation rules", preview: "console" },
      { caption: "Forecast reporting", preview: "graph" },
    ],
  },
  {
    slug: "northwind-storefront",
    title: "Northwind Storefront",
    category: "E-commerce",
    categories: ["E-commerce", "Web Apps", "Dashboards"],
    year: "2024",
    description:
      "A headless commerce build for a catalogue that outgrew its all-in-one platform.",
    summary:
      "Northwind pairs a fast, content-rich storefront with a custom merchandising back office, decoupled from the checkout and payments provider.",
    layout: "wide",
    preview: "browser",
    technologies: ["Next.js", "TypeScript", "GraphQL", "Stripe", "Cloudflare"],
    challenge:
      "The existing platform made every catalogue change slow and every custom feature difficult to deliver. Page speed was poor, and the merchandising team could not run the campaigns they needed.",
    solution:
      "We moved to a headless architecture: a Next.js storefront rendered at the edge, a commerce API for catalogue and cart, and a purpose-built merchandising console the team controls directly.",
    features: [
      { title: "Edge-rendered storefront", body: "Fast product and content pages served close to the shopper." },
      { title: "Merchandising console", body: "Collections, promotions and content scheduling owned by the team." },
      { title: "Composable checkout", body: "Checkout and payments isolated behind a clean interface." },
      { title: "Search & discovery", body: "Faceted search tuned to the catalogue's real structure." },
    ],
    architecture: [
      { label: "Frontend", detail: "Next.js storefront on the edge, ISR for catalogue, partial hydration" },
      { label: "API Layer", detail: "GraphQL commerce gateway, cached reads, signed mutations" },
      { label: "Services", detail: "Catalogue, cart, promotions and content services" },
      { label: "Database", detail: "PostgreSQL for commerce data, search index for discovery" },
      { label: "External Integrations", detail: "Payments, tax, shipping and the ERP" },
    ],
    tech: [
      { group: "Frontend", items: ["Next.js", "TypeScript", "Tailwind CSS"] },
      { group: "Backend", items: ["Node.js", "GraphQL", "BullMQ"] },
      { group: "Database", items: ["PostgreSQL", "Meilisearch"] },
      { group: "Cloud", items: ["Cloudflare", "Fly.io"] },
      { group: "DevOps", items: ["GitHub Actions", "Grafana", "Sentry"] },
    ],
    results: [
      "Catalogue changes ship in minutes",
      "Merchandising runs campaigns unaided",
      "Faster pages across the catalogue",
      "Checkout that can be swapped without a rebuild",
    ],
    gallery: [
      { caption: "Product detail page", preview: "browser" },
      { caption: "Merchandising console", preview: "dashboard" },
      { caption: "Promotions scheduler", preview: "console" },
    ],
  },
];

export const projectCategories: (ProjectCategory | "All")[] = [
  "All",
  "AI",
  "SaaS",
  "Web Apps",
  "Mobile",
  "CRM / ERP",
  "FinTech",
  "E-commerce",
  "Dashboards",
  "Automation",
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getAdjacentProject(slug: string): Project {
  const index = projects.findIndex((p) => p.slug === slug);
  return projects[(index + 1) % projects.length];
}
