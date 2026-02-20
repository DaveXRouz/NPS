import type { Config } from "tailwindcss";
import rtl from "tailwindcss-rtl";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nps: {
          bg: {
            DEFAULT: "var(--nps-bg)",
            card: "var(--nps-bg-card)",
            input: "var(--nps-bg-input)",
            hover: "var(--nps-bg-hover)",
            sidebar: "var(--nps-bg-sidebar)",
            elevated: "var(--nps-bg-hover)",
            button: "var(--nps-accent)",
            danger: "#da3633",
            success: "#238636",
          },
          border: "var(--nps-border)",
          text: {
            DEFAULT: "var(--nps-text)",
            dim: "var(--nps-text-dim)",
            bright: "var(--nps-text-bright)",
          },
          accent: {
            DEFAULT: "var(--nps-accent)",
            hover: "var(--nps-accent-hover)",
            dim: "var(--nps-accent-dim)",
          },
          success: "#3fb950",
          warning: "#d29922",
          error: "#f85149",
          purple: "#a371f7",
          score: {
            low: "#f85149",
            mid: "#d29922",
            high: "#238636",
            peak: "#d4a017",
          },
          stat: {
            readings: "#4fc3f7",
            confidence: "#10b981",
            type: "#a78bfa",
            streak: "#f8b400",
          },
          ai: {
            bg: "#1a1033",
            border: "#7c3aed",
            text: "#c4b5fd",
            accent: "#a78bfa",
          },
          oracle: {
            bg: "#0f1a2e",
            border: "#1e3a5f",
            accent: "#4fc3f7",
          },
        },
      },
      fontFamily: {
        sans: ['"Lora"', '"Georgia"', "serif"],
        display: ['"Cinzel Decorative"', "serif"],
        mono: ["JetBrains Mono", "Consolas", "Courier", "monospace"],
      },
      ringColor: {
        focus: "var(--nps-accent)",
      },
      boxShadow: {
        nps: "var(--nps-shadow)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.4s ease-out forwards",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "nps-fade-in": "nps-fade-in 0.3s ease-out forwards",
        "nps-pulse-glow": "nps-pulse-glow 2s ease-in-out infinite",
        "nps-rise-in": "nps-rise-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
        "nps-glimmer": "nps-glimmer 2.5s ease-in-out infinite",
        "nps-ring-pulse": "nps-ring-pulse 2s ease-out infinite",
        "nps-orbit-slow": "nps-orbit-slow 20s linear infinite",
      },
      keyframes: {
        "nps-fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "nps-pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 4px #3fb950" },
          "50%": { boxShadow: "0 0 16px #3fb950, 0 0 32px #3fb95040" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "nps-rise-in": {
          from: { opacity: "0", transform: "translateY(24px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "nps-glimmer": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "nps-ring-pulse": {
          from: { boxShadow: "0 0 0 0 var(--nps-accent)", opacity: "1" },
          to: { boxShadow: "0 0 0 12px transparent", opacity: "0" },
        },
        "nps-orbit-slow": {
          from: { transform: "rotate(0deg) translateX(80px) rotate(0deg)" },
          to: {
            transform: "rotate(360deg) translateX(80px) rotate(-360deg)",
          },
        },
      },
    },
  },
  plugins: [rtl],
} satisfies Config;
