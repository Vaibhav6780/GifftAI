import Link from "next/link";
import { ArrowRight } from "@/components/MagneticButton";

export default function NotFound() {
  return (
    <section className="shell flex min-h-[70vh] flex-col items-start justify-center py-32">
      <span className="eyebrow flex items-center gap-2">
        <span className="h-px w-6 bg-accent" />
        404
      </span>
      <h1 className="mt-6 text-display-md text-ink">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
        The link may be broken or the page may have moved. Use the links below
        to continue.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Link href="/" className="btn-accent">
          Back home
          <ArrowRight />
        </Link>
        <Link href="/projects" className="btn-ghost">
          See our work
          <ArrowRight />
        </Link>
      </div>
    </section>
  );
}
