import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { TechnologyGrid } from "@/components/TechnologyGrid";

export const metadata: Metadata = {
  title: "Technologies",
  description:
    "The engineering map GIFFT AI builds on — frontend, backend, mobile, databases, AI, cloud, DevOps, payments and analytics.",
  alternates: { canonical: "/technologies" },
};

export default function TechnologiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Technologies"
        title="The engineering foundation we build on."
        subtitle="We select technologies based on how well they perform in production and how maintainable they remain over time. The following is the stack we work with across projects."
      />
      <TechnologyGrid />
    </>
  );
}
