"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { nav } from "@/lib/site";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { ArrowRight } from "./MagneticButton";

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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`border-b transition-all duration-500 ease-out-expo ${
          scrolled || open
            ? "border-line/10 bg-bg/80 backdrop-blur-xl"
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
                  className={`relative px-3.5 py-2 text-sm transition-colors duration-300 ${
                    active ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-3.5 -bottom-px h-px bg-accent"
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/contact"
              className="btn-accent hidden md:inline-flex"
            >
              Start a Project
              <ArrowRight />
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line/60 text-ink md:hidden"
            >
              <span className="relative block h-3.5 w-4">
                <span
                  className={`absolute left-0 block h-px w-full bg-current transition-all duration-300 ${
                    open ? "top-1.5 rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 top-1.5 block h-px w-full bg-current transition-all duration-300 ${
                    open ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 block h-px w-full bg-current transition-all duration-300 ${
                    open ? "top-1.5 -rotate-45" : "top-3"
                  }`}
                />
              </span>
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="border-b border-line/10 bg-bg/95 backdrop-blur-xl md:hidden"
          >
            <div className="shell flex flex-col py-6">
              {nav.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className="flex items-center justify-between border-b border-line/10 py-4 text-2xl font-display text-ink"
                  >
                    {item.label}
                    <ArrowRight className="text-muted" />
                  </Link>
                </motion.div>
              ))}
              <Link
                href="/contact"
                className="btn-accent mt-6 justify-center py-3"
              >
                Start a Project
                <ArrowRight />
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
