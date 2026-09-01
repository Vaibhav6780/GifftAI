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
      "When your process doesn't fit an off-the-shelf tool, we build the system that does — starting from how your team actually works, not from a feature list.",
    deliverables: ["Workflow modelling", "System architecture", "Full-stack build", "Rollout & training"],
  },
  {
    id: "saas-products",
    index: "02",
    title: "SaaS Products",
    summary: "From MVP to scalable SaaS platforms.",
    detail:
      "We take product ideas from a first working version to a platform that holds up under real customers — multi-tenancy, billing, permissions and the operational tooling around them.",
    deliverables: ["Product engineering", "Multi-tenant architecture", "Billing & entitlements", "Admin & analytics"],
  },
  {
    id: "ai-automation",
    index: "03",
    title: "AI & Automation",
    summary: "Intelligent workflows, AI systems and automation.",
    detail:
      "We build AI features that are grounded, evaluated and safe to ship — retrieval systems, assistants and automations that remove real work instead of adding risk.",
    deliverables: ["Retrieval pipelines", "LLM orchestration", "Evaluation harnesses", "Workflow automation"],
  },
  {
    id: "web-applications",
    index: "04",
    title: "Web Applications",
    summary: "Modern, fast and scalable applications.",
    detail:
      "Production web apps with the fundamentals right: performance, accessibility, observability and a codebase your team can keep building on.",
    deliverables: ["Frontend architecture", "Design system", "API integration", "Performance & Core Web Vitals"],
  },
  {
    id: "mobile-applications",
    index: "05",
    title: "Mobile Applications",
    summary: "iOS and Android products.",
    detail:
      "Cross-platform mobile apps that feel native, work offline where they need to, and ship through a release pipeline you control.",
    deliverables: ["React Native / Expo", "Offline-first data", "App store delivery", "Crash & usage analytics"],
  },
  {
    id: "crm-erp",
    index: "06",
    title: "CRM & ERP",
    summary: "Operational systems that centralize business processes.",
    detail:
      "Operational software that brings quoting, delivery, inventory or finance into one place — shaped to your process rather than forcing your process into a template.",
    deliverables: ["Process mapping", "Data model design", "Automation", "Reporting & forecasting"],
  },
  {
    id: "apis-backend",
    index: "07",
    title: "APIs & Backend",
    summary: "Reliable APIs, integrations and backend architecture.",
    detail:
      "The systems other systems depend on — well-designed APIs, resilient integrations, and backends with tracing, idempotency and clear failure behaviour.",
    deliverables: ["API design", "Integration layers", "Event-driven services", "Observability"],
  },
  {
    id: "dashboards",
    index: "08",
    title: "Dashboards",
    summary: "Analytics, reporting and operational interfaces.",
    detail:
      "Interfaces that turn data into decisions — operational dashboards, analytics and reporting built on models that stay correct as the business changes.",
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
    body: "We sit with the people who do the work, map the process end to end, and find where the real friction is — before writing any code.",
  },
  {
    index: "02",
    title: "Define",
    body: "We turn the findings into a technical plan: scope, architecture, milestones and the trade-offs, written plainly enough to decide on.",
  },
  {
    index: "03",
    title: "Build",
    body: "We ship in working increments, in your environment, with tests and observability from the first commit — not bolted on later.",
  },
  {
    index: "04",
    title: "Launch",
    body: "We roll out deliberately, with the team trained, the data migrated cleanly and a plan for the first weeks in production.",
  },
  {
    index: "05",
    title: "Scale",
    body: "We measure what's actually happening, harden what's under load, and keep improving the system as the business grows into it.",
  },
];

export const beliefs = [
  "Build for the real problem.",
  "Keep systems understandable.",
  "Design for scale.",
  "Automate repetitive work.",
  "Ship, measure and improve.",
];
