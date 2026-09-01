import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
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
      },
      animation: {
        "pulse-line": "pulse-line 4s ease-in-out infinite",
        drift: "drift 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
