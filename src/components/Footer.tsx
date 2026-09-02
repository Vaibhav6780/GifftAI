"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { FinalCTA } from "./FinalCTA";
import { nav, site } from "@/lib/site";

export function Footer() {
  const pathname = usePathname();
  const hideCTA = pathname === "/contact";

  return (
    <footer>
      {!hideCTA && <FinalCTA />}

      <div className="shell py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              25 years of service. We design, build and scale software for
              ambitious companies — from complex business systems to AI-powered
              products.
            </p>
          </div>

          <nav className="flex flex-col gap-3">
            <span className="eyebrow">Site</span>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="w-fit text-sm text-muted transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3">
            <span className="eyebrow">Elsewhere</span>
            {site.social.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit text-sm text-muted transition-colors hover:text-ink"
              >
                {s.label}
              </a>
            ))}
            <a
              href={`mailto:${site.contact.email}`}
              className="mt-1 w-fit text-sm text-muted transition-colors hover:text-ink"
            >
              {site.contact.email}
            </a>
            <a
              href={`tel:${site.contact.phone.replace(/[^+\d]/g, "")}`}
              className="w-fit text-sm text-muted transition-colors hover:text-ink"
            >
              {site.contact.phone}
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line/10 pt-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
