"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid a hydration mismatch on the icon; render a neutral shell first.
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={`group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line/60 text-ink transition-colors duration-300 hover:bg-surface-2 ${className}`}
    >
      <span className="relative block h-4 w-4">
        {/* Sun */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`absolute inset-0 h-4 w-4 transition-all duration-500 ease-out-expo ${
            mounted && theme === "dark"
              ? "scale-100 opacity-100"
              : "scale-50 opacity-0"
          }`}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        {/* Moon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`absolute inset-0 h-4 w-4 transition-all duration-500 ease-out-expo ${
            !mounted || theme === "light"
              ? "scale-100 opacity-100"
              : "scale-50 opacity-0"
          }`}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
    </button>
  );
}
