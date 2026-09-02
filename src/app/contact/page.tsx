import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell GIFFT AI about the system you intend to build. We will help translate it into a practical technical plan.",
  alternates: { canonical: "/contact" },
};

const details = [
  { label: "Email", value: site.contact.email, href: `mailto:${site.contact.email}` },
  { label: "Phone", value: site.contact.phone, href: `tel:${site.contact.phone.replace(/[^+\d]/g, "")}` },
  { label: "Location", value: site.contact.location },
  { label: "LinkedIn", value: "linkedin.com/company/gifftai", href: site.contact.linkedin },
  { label: "WhatsApp", value: "Message us", href: site.contact.whatsapp },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Let's discuss your project."
        subtitle="Tell us about the system you intend to build. We will help translate it into a practical technical plan."
      />

      <section className="shell grid gap-14 py-16 sm:py-20 lg:grid-cols-[1.4fr_0.9fr] lg:gap-20">
        <ContactForm />

        <aside className="flex flex-col gap-8 lg:border-l lg:border-line/10 lg:pl-14">
          <div>
            <h2 className="eyebrow">Direct</h2>
            <dl className="mt-4 space-y-4">
              {details.map((d) => (
                <div key={d.label} className="flex flex-col gap-0.5">
                  <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
                    {d.label}
                  </dt>
                  <dd className="text-sm text-ink">
                    {d.href ? (
                      <a
                        href={d.href}
                        target={d.href.startsWith("http") ? "_blank" : undefined}
                        rel={
                          d.href.startsWith("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="link-underline"
                      >
                        {d.value}
                      </a>
                    ) : (
                      d.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card rounded-2xl p-5">
            <p className="text-sm leading-relaxed text-muted">
              If you are still scoping the work, send a short description of the
              problem. We will respond with questions and a suggested first
              step, with no obligation to proceed.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
