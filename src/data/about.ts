/**
 * About-page content. Every field here is editable placeholder copy —
 * replace with real company information. Nothing is fabricated: names,
 * dates and numbers are left as obvious placeholders.
 */

export const companyStory = [
  "GIFFT AI is a software engineering and product studio with 25 years of service. We work with organisations that have outgrown off-the-shelf tools and require systems built around the way they operate.",
  "Our team is senior and hands-on. The people who scope a project are the people who deliver it, from architecture and data modelling through to production rollout.",
  "// Replace this section with your real founding story, mission and the kind of work you want to be known for.",
];

export type TimelineEntry = { year: string; title: string; body: string };

export const timeline: TimelineEntry[] = [
  {
    year: "2001",
    title: "Founded",
    body: "GIFFT AI is established as a software engineering studio. // Confirm the exact year and add the reason it started.",
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
    body: "We invest time in understanding the work before proposing a system. The objective is to resolve the underlying problem rather than to add features.",
  },
  {
    title: "Keep systems understandable",
    body: "We avoid unnecessary complexity. We favour architectures a new engineer can reason about and codebases your team can continue to build on.",
  },
  {
    title: "Design for scale",
    body: "We build for the load expected over the next two years rather than the immediate demo, without over-engineering the parts that will not change.",
  },
  {
    title: "Automate repetitive work",
    body: "Where a task is performed the same way every day, it is a candidate for automation. We remove repetitive manual work methodically.",
  },
  {
    title: "Ship, measure and improve",
    body: "We put working software in front of users early, measure how it performs in practice, and iterate based on evidence.",
  },
];
