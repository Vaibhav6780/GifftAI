"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "./MagneticButton";

const projectTypes = [
  "Web Application",
  "Mobile Application",
  "SaaS",
  "AI / Automation",
  "CRM / ERP",
  "E-commerce",
  "FinTech",
  "API / Backend",
  "Other",
];

const budgets = [
  "Under $25k",
  "$25k – $75k",
  "$75k – $150k",
  "$150k – $400k",
  "$400k+",
  "Not sure yet",
];

const timelines = [
  "As soon as possible",
  "Within 1–3 months",
  "3–6 months",
  "Exploring / no fixed date",
];

type Status = "idle" | "submitting" | "success" | "error";

const fieldBase =
  "w-full rounded-lg border border-line/20 bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (data.company_website) return; // honeypot

    if (!data.name || !data.email || !data.details) {
      setError("Please fill in your name, email and a few details.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setError(
        "Something went wrong sending your message. Email us directly at hello@gifftai.com.",
      );
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-line/10 bg-surface-2 p-8"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <h3 className="mt-4 text-xl text-ink">Message received.</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Thanks for reaching out. We&apos;ll read what you sent and get back
              to you with next steps — usually within two business days.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-5 text-sm text-ink link-underline"
            >
              Send another message
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={onSubmit}
            className="grid gap-5"
            noValidate
          >
            <input
              type="text"
              name="company_website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="name">
                <input id="name" name="name" required className={fieldBase} />
              </Field>
              <Field label="Work email" htmlFor="email">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={fieldBase}
                />
              </Field>
              <Field label="Company" htmlFor="company">
                <input id="company" name="company" className={fieldBase} />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className={fieldBase}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Project type" htmlFor="projectType">
                <select
                  id="projectType"
                  name="projectType"
                  className={fieldBase}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {projectTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Budget" htmlFor="budget">
                <select
                  id="budget"
                  name="budget"
                  className={fieldBase}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {budgets.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <Field label="Timeline" htmlFor="timeline">
                <select
                  id="timeline"
                  name="timeline"
                  className={fieldBase}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {timelines.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Project details" htmlFor="details">
              <textarea
                id="details"
                name="details"
                required
                rows={5}
                placeholder="What are you trying to build, and what's the problem behind it?"
                className={`${fieldBase} resize-y`}
              />
            </Field>

            {error ? (
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-accent disabled:opacity-60"
              >
                {status === "submitting"
                  ? "Sending…"
                  : "Start the Conversation"}
                <ArrowRight />
              </button>
              <p className="text-xs text-faint">
                We reply within two business days.
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
