import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ServiceSection } from "@/components/ServiceSection";
import { ProcessSection } from "@/components/ProcessSection";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "What we build",
  description:
    "From the first architecture diagram to production deployment, GIFFT AI builds custom software, SaaS products, AI systems, web and mobile apps, CRMs, APIs and dashboards.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="What we build"
        subtitle="From the first architecture diagram to production deployment, we build software around the way your business actually works."
      />

      {services.map((service, i) => (
        <ServiceSection key={service.id} service={service} index={i} />
      ))}

      <ProcessSection />
    </>
  );
}
