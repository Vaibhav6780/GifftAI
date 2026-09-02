import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProjectExplorer } from "@/components/ProjectExplorer";

export const metadata: Metadata = {
  title: "Our work",
  description:
    "Production software built for real business problems — SaaS platforms, AI systems, CRMs, dashboards and automation engineered by GIFFT AI.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Our work"
        subtitle="A selection of production systems delivered for real business problems across SaaS, AI, operations and commerce."
      />
      <ProjectExplorer />
    </>
  );
}
