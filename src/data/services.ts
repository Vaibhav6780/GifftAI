export type Service = {
  id: string;
  index: string;
  title: string;
  summary: string;
  detail: string;
  deliverables: string[];
};

export const services: Service[] = [
  {
    id: "custom-software",
    index: "01",
    title: "Custom Software",
    summary: "Business-specific software built around real workflows.",
    detail:
      "When your process does not fit an off-the-shelf tool, we build the system that does, starting from how your team works rather than from a predefined feature set.",
    deliverables: ["Workflow modelling", "System architecture", "Full-stack build", "Rollout & training"],
  },
  {
    id: "saas-products",
    index: "02",
    title: "SaaS Products",
    summary: "From MVP to scalable SaaS platforms.",
    detail:
      "We take product ideas from a first working version to a platform that performs reliably with a live customer base: multi-tenancy, billing, permissions and the operational tooling around them.",
    deliverables: ["Product engineering", "Multi-tenant architecture", "Billing & entitlements", "Admin & analytics"],
  },
  {
    id: "ai-automation",
    index: "03",
    title: "AI & Automation",
    summary: "Intelligent workflows, AI systems and automation.",
    detail:
      "We build AI features that are grounded, evaluated and safe to deploy: retrieval systems, assistants and automations that reduce manual work without introducing unnecessary risk.",
    deliverables: ["Retrieval pipelines", "LLM orchestration", "Evaluation harnesses", "Workflow automation"],
  },
  {
    id: "web-applications",
    index: "04",
    title: "Web Applications",
    summary: "Modern, fast and scalable applications.",
    detail:
      "Production web applications with the fundamentals in place: performance, accessibility, observability and a codebase your team can continue to develop.",
    deliverables: ["Frontend architecture", "Design system", "API integration", "Performance & Core Web Vitals"],
  },
  {
    id: "mobile-applications",
    index: "05",
    title: "Mobile Applications",
    summary: "iOS and Android products.",
    detail:
      "Cross-platform mobile applications that behave like native apps, operate offline where required, and are released through a delivery pipeline you control.",
    deliverables: ["React Native / Expo", "Offline-first data", "App store delivery", "Crash & usage analytics"],
  },
  {
    id: "crm-erp",
    index: "06",
    title: "CRM & ERP",
    summary: "Operational systems that centralize business processes.",
    detail:
      "Operational software that brings quoting, delivery, inventory or finance into one place, shaped to your process rather than requiring your process to conform to a template.",
    deliverables: ["Process mapping", "Data model design", "Automation", "Reporting & forecasting"],
  },
  {
    id: "apis-backend",
    index: "07",
    title: "APIs & Backend",
    summary: "Reliable APIs, integrations and backend architecture.",
    detail:
      "The infrastructure that other systems depend on: well-designed APIs, resilient integrations, and backends with tracing, idempotency and clearly defined failure behaviour.",
    deliverables: ["API design", "Integration layers", "Event-driven services", "Observability"],
  },
  {
    id: "dashboards",
    index: "08",
    title: "Dashboards",
    summary: "Analytics, reporting and operational interfaces.",
    detail:
      "Interfaces that support decision-making: operational dashboards, analytics and reporting built on data models that remain accurate as the business changes.",
    deliverables: ["Metric modelling", "Data pipelines", "Visualisation", "Self-serve reporting"],
  },
];

export type ProcessStep = {
  index: string;
  title: string;
  body: string;
};

export const processSteps: ProcessStep[] = [
  {
    index: "01",
    title: "Discover",
    body: "We work directly with the people who carry out the process, map it end to end, and identify where the significant friction lies before any code is written.",
  },
  {
    index: "02",
    title: "Define",
    body: "We convert the findings into a technical plan covering scope, architecture, milestones and trade-offs, documented clearly enough to support a decision.",
  },
  {
    index: "03",
    title: "Build",
    body: "We deliver in working increments within your environment, with tests and observability included from the first commit rather than added later.",
  },
  {
    index: "04",
    title: "Launch",
    body: "We roll out deliberately, with the team trained, the data migrated cleanly and a plan in place for the first weeks in production.",
  },
  {
    index: "05",
    title: "Scale",
    body: "We monitor how the system behaves in practice, reinforce the components under load, and continue improving it as the business grows.",
  },
];

export const beliefs = [
  "Build for the real problem.",
  "Keep systems understandable.",
  "Design for scale.",
  "Automate repetitive work.",
  "Ship, measure and improve.",
];
