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
        },
        surface: {
          950: "#0a0a0f",
          900: "#10101a",
          800: "#16162a",
          700: "#1e1e38",
          600: "#252548",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease-out",
        "slide-up":   "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-r": "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "bounce-in":  "bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "pulse-ring": "pulseRing 1.5s ease-out infinite",
        "spin-slow":  "spin 3s linear infinite",
        "heart-pop":  "heartPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
          "0%":   { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        slideInRight: {
          "0%":   { opacity: 0, transform: "translateX(20px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        bounceIn: {
          "0%":   { opacity: 0, transform: "scale(0.8)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        pulseRing: {
          "0%":   { transform: "scale(0.9)", opacity: 0.7 },
          "70%":  { transform: "scale(1.3)", opacity: 0 },
          "100%": { transform: "scale(1.3)", opacity: 0 },
        },
        heartPop: {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(1.4)" },
          "100%": { transform: "scale(1)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-gradient":
          "radial-gradient(at 40% 20%, hsla(260,100%,74%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(220,100%,65%,0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(285,100%,74%,0.25) 0px, transparent 50%)",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 4px 24px 0 rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.05)",
        "glass-lg": "0 8px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(255,255,255,0.07)",
        brand: "0 0 20px 0 rgba(124,58,237,0.4)",
        "brand-sm": "0 0 10px 0 rgba(124,58,237,0.3)",
      },
    },
  },
  plugins: [],
};
