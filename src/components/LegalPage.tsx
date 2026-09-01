import { PageHeader } from "./PageHeader";

export type LegalSection = { heading: string; body: string[] };

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PageHeader eyebrow="Legal" title={title} subtitle={intro} />
      <div className="shell py-16 sm:py-20">
        <p className="font-mono text-xs text-faint">Last updated: {updated}</p>
        <div className="mt-10 max-w-2xl space-y-10">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg text-ink">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p
                  key={i}
                  className="mt-3 text-sm leading-relaxed text-muted"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
          <p className="font-mono text-xs text-faint">
            {"// Placeholder legal copy — replace with text reviewed by your counsel."}
          </p>
        </div>
      </div>
    </>
  );
}
