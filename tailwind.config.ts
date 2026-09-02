import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        "bg-2": "rgb(var(--bg-2) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--surface-3) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-hi": "rgb(var(--accent-hi) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        "accent-2": "rgb(var(--accent-2) / <alpha-value>)",
        "accent-2-hi": "rgb(var(--accent-2-hi) / <alpha-value>)",
        "accent-2-soft": "rgb(var(--accent-2-soft) / <alpha-value>)",

        /* shadcn/ui compatibility — mapped onto the GIFFT palette so its
           primitives (inputs, select, sheet, button) inherit the theme. */
        background: "rgb(var(--bg) / <alpha-value>)",
        foreground: "rgb(var(--ink) / <alpha-value>)",
        border: "rgb(var(--line) / 0.16)",
        input: "rgb(var(--line) / 0.22)",
        ring: "rgb(var(--accent) / 0.5)",
        primary: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "rgb(var(--surface-2) / <alpha-value>)",
          foreground: "rgb(var(--ink) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(206 62 42 / <alpha-value>)",
          foreground: "#ffffff",
        },
        "muted-foreground": "rgb(var(--muted) / <alpha-value>)",
        "accent-foreground": "rgb(var(--ink) / <alpha-value>)",
        popover: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          foreground: "rgb(var(--ink) / <alpha-value>)",
        },
        "card-foreground": "rgb(var(--ink) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-lg": ["clamp(2.75rem, 6vw + 1rem, 6rem)", { lineHeight: "0.98", letterSpacing: "-0.03em" }],
        "display-md": ["clamp(2.25rem, 4vw + 1rem, 4rem)", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
        "display-sm": ["clamp(1.75rem, 2vw + 1rem, 2.75rem)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
      },
      maxWidth: {
        shell: "82rem",
      },
      boxShadow: {
        "elev-1": "var(--elev-1)",
        "elev-2": "var(--elev-2)",
        "elev-3": "var(--elev-3)",
        "elev-4": "var(--elev-4)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "pulse-line": {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.6" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "flow-dot": {
          from: { "offset-distance": "0%" },
          to: { "offset-distance": "100%" },
        },
      },
      animation: {
        "pulse-line": "pulse-line 4s ease-in-out infinite",
        drift: "drift 6s ease-in-out infinite",
        "spin-slow": "spin-slow 22s linear infinite",
        shimmer: "shimmer 2.5s ease-in-out infinite",
        "flow-dot": "flow-dot 4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
