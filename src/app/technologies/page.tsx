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
        title="An engineering map, not a wall of logos."
        subtitle="We choose tools for how well they hold up in production — not for how they look on a slide. Here's the ground we build on."
      />
      <TechnologyGrid />
    </>
  );
}
