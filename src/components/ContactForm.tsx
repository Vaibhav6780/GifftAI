"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "./MagneticButton";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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

const control =
  "h-11 rounded-lg border-line/20 bg-bg/50 shadow-elev-1 focus-visible:ring-4 focus-visible:ring-accent/12 focus-visible:border-accent data-[placeholder]:text-faint";

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
            className="card rounded-2xl p-8"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent shadow-elev-1">
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
            className="card grid gap-5 rounded-2xl p-6 sm:p-8"
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
                <Input id="name" name="name" required className={control} />
              </Field>
              <Field label="Work email" htmlFor="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={control}
                />
              </Field>
              <Field label="Company" htmlFor="company">
                <Input id="company" name="company" className={control} />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" className={control} />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Project type" htmlFor="projectType">
                <PickList
                  id="projectType"
                  name="projectType"
                  options={projectTypes}
                />
              </Field>
              <Field label="Budget" htmlFor="budget">
                <PickList id="budget" name="budget" options={budgets} />
              </Field>
              <Field label="Timeline" htmlFor="timeline">
                <PickList id="timeline" name="timeline" options={timelines} />
              </Field>
            </div>

            <Field label="Project details" htmlFor="details">
              <Textarea
                id="details"
                name="details"
                required
                rows={5}
                placeholder="What are you trying to build, and what's the problem behind it?"
                className={`${control} h-auto resize-y`}
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

function PickList({
  id,
  name,
  options,
}: {
  id: string;
  name: string;
  options: string[];
}) {
  return (
    <Select name={name}>
      <SelectTrigger id={id} className={control}>
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent className="border-line/20 bg-surface shadow-elev-3">
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
