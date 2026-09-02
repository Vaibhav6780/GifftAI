export const site = {
  name: "GIFFT AI",
  domain: "gifftai.com",
  url: "https://gifftai.com",
  tagline: "We build software that moves businesses forward.",
  description:
    "GIFFT AI designs and engineers web applications, SaaS platforms, AI systems and business software built for real-world scale.",
  // ---- Editable contact information -------------------------------------
  contact: {
    email: "gifftaimktg@gmail.com",
    phone: "+91 95606 10184",
    location: "Remote — worldwide",
    linkedin: "https://www.linkedin.com/company/gifftai/",
    whatsapp: "https://wa.me/919560610184",
  },
  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/gifftai/" },
    { label: "GitHub", href: "https://github.com/gifftai" },
    { label: "X", href: "https://x.com/gifftai" },
  ],
} as const;

export const nav = [
  { label: "Work", href: "/projects" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Technologies", href: "/technologies" },
  { label: "Contact", href: "/contact" },
] as const;
