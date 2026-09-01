import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms that apply to your use of the GIFFT AI website.",
  alternates: { canonical: "/terms" },
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      updated="—"
      intro="The terms that apply to your use of this website."
      sections={[
        {
          heading: "Use of the site",
          body: [
            "This website is provided for general information about GIFFT AI and its services. Content may change without notice.",
          ],
        },
        {
          heading: "No warranty",
          body: [
            "The site is provided on an \"as is\" basis. We make no warranties about the accuracy or completeness of its content.",
          ],
        },
        {
          heading: "Engagements",
          body: [
            "Any project we undertake is governed by a separate written agreement. Nothing on this site constitutes an offer or a contract.",
          ],
        },
      ]}
    />
  );
}
