import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /* ── Oak-inspired warm palette ────────────────────── */
        ink: "#222222",
        paper: "#ffffff",
        cream: "#FFFDF7",

        /* Primary accent: soft mint-green (Oak's #BEF2BD family) */
        mint: {
          DEFAULT: "#BEF2BD",
          50: "#F0FDF0",
          100: "#DFF9DE",
          200: "#BEF2BD",
          300: "#8DE68C",
          400: "#5CD35B",
          500: "#3BBF3A",
          600: "#2A9D29",
          700: "#237D22",
          800: "#1F631F",
          900: "#1B511B",
        },

        /* Legacy accent kept for admin compatibility */
        accent: {
          DEFAULT: "#ff6a00",
          50: "#fff4ec",
          100: "#ffe4cc",
          200: "#ffc999",
          300: "#ffab5c",
          400: "#ff8a2b",
          500: "#ff6a00",
          600: "#e05800",
          700: "#b84600",
          800: "#8f3700",
          900: "#6e2b00",
        },

        /* Warm neutrals */
        warm: {
          50: "#FAFAF8",
          100: "#F5F4F0",
          200: "#ECEAE4",
          300: "#DBD8D0",
          400: "#B8B4A8",
          500: "#948F82",
          600: "#706C62",
          700: "#565349",
          800: "#3D3A33",
          900: "#222222",
        },

        /* Subject icon colours — one per subject, pastel-toned */
        subject: {
          maths: "#FFD6E0",
          english: "#C5DEFF",
          science: "#D4F5D4",
          social: "#FFE8C8",
          art: "#E8D5F5",
          tech: "#D5EEF5",
          health: "#FFF2C8",
          religious: "#F5D5E8",
          language: "#D5F5E8",
          business: "#F5E8D5",
          agric: "#D5F5D5",
          home: "#FFE0D5",
        },
      },
      fontFamily: {
        sans: ["var(--font-lexend)", "var(--font-inter)", "system-ui", "sans-serif"],
        admin: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "oak": "16px",
        "oak-lg": "20px",
        "oak-xl": "24px",
      },
      boxShadow: {
        "warm-sm": "0 1px 3px rgba(34, 34, 34, 0.06), 0 1px 2px rgba(34, 34, 34, 0.04)",
        "warm": "0 4px 12px rgba(34, 34, 34, 0.08), 0 2px 4px rgba(34, 34, 34, 0.04)",
        "warm-lg": "0 12px 32px rgba(34, 34, 34, 0.1), 0 4px 8px rgba(34, 34, 34, 0.04)",
        "warm-xl": "0 20px 48px rgba(34, 34, 34, 0.12), 0 8px 16px rgba(34, 34, 34, 0.04)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -40px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-up": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out forwards",
        blob: "blob 14s infinite ease-in-out",
        float: "float 5s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        "slide-down": "slide-down 0.25s ease-out forwards",
        "scale-up": "scale-up 0.2s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
