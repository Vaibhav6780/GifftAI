"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { nav } from "@/lib/site";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { ArrowRight } from "./MagneticButton";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`border-b transition-all duration-500 ease-out-expo ${
          scrolled || open
            ? "glass border-line/15 shadow-elev-1"
            : "border-transparent bg-transparent"
        }`}
      >
        <nav className="shell flex h-16 items-center justify-between">
          <Logo />

          <div className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-3.5 py-2 text-sm transition-colors duration-300 ${
                    active ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full border border-line/15 bg-surface/70 shadow-elev-1"
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    />
                  ) : null}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/contact" className="btn-accent hidden md:inline-flex">
              Start a Project
              <ArrowRight />
            </Link>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                aria-label="Open menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line/40 bg-surface/60 text-ink shadow-elev-1 md:hidden"
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent
                side="right"
                aria-describedby={undefined}
                className="glass w-[86vw] max-w-sm border-line/15 p-0"
              >
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex h-full flex-col px-6 pb-8 pt-16">
                  <nav className="flex flex-col">
                    {nav.map((item, i) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      return (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.04 + i * 0.05 }}
                        >
                          <Link
                            href={item.href}
                            className={`flex items-center justify-between border-b border-line/10 py-4 font-display text-2xl transition-colors ${
                              active ? "text-accent" : "text-ink"
                            }`}
                          >
                            {item.label}
                            <ArrowRight className="text-muted" />
                          </Link>
                        </motion.div>
                      );
                    })}
                  </nav>
                  <Link
                    href="/contact"
                    className="btn-accent mt-8 justify-center py-3"
                  >
                    Start a Project
                    <ArrowRight />
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
}
