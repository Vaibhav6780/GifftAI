export type TechCategory = {
  name: string;
  note: string;
  items: string[];
};

export const technologyMap: TechCategory[] = [
  {
    name: "Frontend",
    note: "Interfaces that stay fast and accessible as they grow.",
    items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Vite", "Framer Motion", "Radix UI"],
  },
  {
    name: "Backend",
    note: "Services with clear contracts and predictable failure behaviour.",
    items: ["Node.js", "Go", "Python", "NestJS", "FastAPI", "gRPC", "GraphQL"],
  },
  {
    name: "Mobile",
    note: "Cross-platform apps that feel native and ship on your schedule.",
    items: ["React Native", "Expo", "Swift", "Kotlin"],
  },
  {
    name: "Database",
    note: "Data models designed to stay correct under change.",
    items: ["PostgreSQL", "Redis", "SQLite", "pgvector", "ClickHouse", "Prisma"],
  },
  {
    name: "AI",
    note: "Grounded, evaluated AI systems — not demos.",
    items: ["Claude", "OpenAI", "LangGraph", "Vector search", "RAG pipelines", "Ragas"],
  },
  {
    name: "Cloud",
    note: "Infrastructure sized to the workload, defined as code.",
    items: ["AWS", "Google Cloud", "Azure", "Cloudflare", "Vercel", "Fly.io"],
  },
  {
    name: "DevOps",
    note: "Delivery pipelines and observability from the first commit.",
    items: ["Docker", "Terraform", "GitHub Actions", "OpenTelemetry", "Grafana", "Sentry"],
  },
  {
    name: "Payments",
    note: "Money movement with audit trails and reconciliation built in.",
    items: ["Stripe", "Adyen", "Double-entry ledgers", "Webhooks"],
  },
  {
    name: "Analytics",
    note: "Metrics modelled once, trusted everywhere.",
    items: ["dbt", "BigQuery", "Metabase", "PostHog", "Segment"],
  },
];
