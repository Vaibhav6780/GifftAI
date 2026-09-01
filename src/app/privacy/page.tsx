import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How GIFFT AI handles the information you share with us.",
  alternates: { canonical: "/privacy" },
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="—"
      intro="How we handle the information you share with us."
      sections={[
        {
          heading: "What we collect",
          body: [
            "When you contact us through the site, we collect the details you submit — your name, email, company, and the description of your project.",
            "We use standard, privacy-respecting analytics to understand how the site is used. We do not sell personal data.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "We use your contact details only to respond to your enquiry and to discuss potential work.",
          ],
        },
        {
          heading: "Your choices",
          body: [
            "You can ask us to delete the information you've shared at any time by emailing us.",
          ],
        },
      ]}
    />
  );
}
