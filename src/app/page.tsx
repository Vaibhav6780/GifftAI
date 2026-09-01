import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { CapabilityStrip } from "@/components/CapabilityStrip";
import { BrandStatement } from "@/components/BrandStatement";
import { SelectedWork } from "@/components/SelectedWork";
import { ProcessSection } from "@/components/ProcessSection";
import { HomeServices } from "@/components/HomeServices";

export const metadata: Metadata = {
  title: "We build software that moves businesses forward",
  description:
    "GIFFT AI is a software engineering and product studio. We design and build web applications, SaaS platforms, AI systems and business software for ambitious companies.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <CapabilityStrip />
      <BrandStatement />
      <SelectedWork />
      <HomeServices />
      <ProcessSection />
    </>
  );
}
