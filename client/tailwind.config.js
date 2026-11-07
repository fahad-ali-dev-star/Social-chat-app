/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        surface: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#334155",
          700: "#1e293b",
          800: "#0f172a",
          900: "#0b0f19",
          950: "#070a12",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      animation: {
        "fade-in":    "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up":   "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-r": "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in":   "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "spin-slow":  "spin 2.5s linear infinite",
        "progress":   "progress 20s linear forwards",
      },
      keyframes: {
        progress: {
          "0%":   { width: "0%" },
          "100%": { width: "100%" },
        },
        fadeIn: {
          "0%":   { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%":   { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        slideInRight: {
          "0%":   { opacity: 0, transform: "translateX(16px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        scaleIn: {
          "0%":   { opacity: 0, transform: "scale(0.96)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        glass: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        "glass-lg": "0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
        brand: "0 4px 14px 0 rgba(124, 58, 237, 0.25)",
        "brand-sm": "0 2px 8px 0 rgba(124, 58, 237, 0.15)",
        popover: "0 10px 30px -4px rgba(0, 0, 0, 0.2), 0 4px 12px -2px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
