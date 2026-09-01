/**
 * About-page content. Every field here is editable placeholder copy —
 * replace with real company information. Nothing is fabricated: names,
 * dates and numbers are left as obvious placeholders.
 */

export const companyStory = [
  "GIFFT AI is a software engineering and product studio. We work with companies that have outgrown off-the-shelf tools and need systems built around how they actually operate.",
  "We keep the team small and senior. The people who scope your project are the people who build it — from architecture and data modelling through to the production rollout.",
  "// Replace this section with your real founding story, mission and the kind of work you want to be known for.",
];

export type TimelineEntry = { year: string; title: string; body: string };

export const timeline: TimelineEntry[] = [
  {
    year: "20XX",
    title: "Founded",
    body: "// Add the year GIFFT AI was founded and the reason it started.",
  },
  {
    year: "20XX",
    title: "First platform shipped",
    body: "// Describe the first significant system delivered.",
  },
  {
    year: "20XX",
    title: "AI practice established",
    body: "// Note when the AI & automation practice was formalised.",
  },
  {
    year: "Today",
    title: "Where we are now",
    body: "// Summarise the current focus and the type of clients you serve.",
  },
];

export type TeamMember = { name: string; role: string; focus: string };

export const team: TeamMember[] = [
  {
    name: "Team member",
    role: "Founder / Principal Engineer",
    focus: "// Architecture, backend systems, delivery",
  },
  {
    name: "Team member",
    role: "Product Designer",
    focus: "// Interface design, design systems, UX",
  },
  {
    name: "Team member",
    role: "Senior Engineer",
    focus: "// Full-stack, cloud infrastructure, DevOps",
  },
  {
    name: "Team member",
    role: "AI Engineer",
    focus: "// Retrieval systems, evaluation, LLM orchestration",
  },
];

export const values = [
  {
    title: "Build for the real problem",
    body: "We spend time understanding the work before proposing a system. The goal is to solve the problem in front of us, not to ship features.",
  },
  {
    title: "Keep systems understandable",
    body: "Clever is a liability. We favour architectures a new engineer can reason about, and codebases your team can keep building on.",
  },
  {
    title: "Design for scale",
    body: "We build for the load you'll have in two years, not the demo you need next week — without over-engineering the parts that won't move.",
  },
  {
    title: "Automate repetitive work",
    body: "If a person does the same thing every day, that's a candidate for automation. We remove the busywork, carefully.",
  },
  {
    title: "Ship, measure and improve",
    body: "We put working software in front of real users early, watch what actually happens, and iterate on evidence.",
  },
];
