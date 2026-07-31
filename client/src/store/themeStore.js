import { create } from "zustand";

export const ACCENT_THEMES = [
  {
    id: "purple",
    label: "Purple",
    color: "#7c3aed",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)",
    glow: "0 0 20px rgba(124, 58, 237, 0.4)",
  },
  {
    id: "emerald",
    label: "Emerald",
    color: "#10b981",
    gradient: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
    glow: "0 0 20px rgba(16, 185, 129, 0.4)",
  },
  {
    id: "blue",
    label: "Ocean",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #38bdf8 100%)",
    glow: "0 0 20px rgba(59, 130, 246, 0.4)",
  },
  {
    id: "rose",
    label: "Sunset",
    color: "#f43f5e",
    gradient: "linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)",
    glow: "0 0 20px rgba(244, 63, 94, 0.4)",
  },
  {
    id: "amber",
    label: "Gold",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fcd34d 100%)",
    glow: "0 0 20px rgba(245, 158, 11, 0.4)",
  },
  {
    id: "cyan",
    label: "Cyber",
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #67e8f9 100%)",
    glow: "0 0 20px rgba(6, 182, 212, 0.4)",
  },
];

function applyTheme(isDark, accent) {
  const root = document.documentElement;
  const theme = ACCENT_THEMES.find((t) => t.id === accent) || ACCENT_THEMES[0];

  root.style.setProperty("--brand-gradient", theme.gradient);
  root.style.setProperty("--glow-brand", theme.glow);
  root.style.setProperty("--accent-color", theme.color);

  if (isDark) {
    root.classList.remove("light-mode");
  } else {
    root.classList.add("light-mode");
  }

  localStorage.setItem("theme_dark", isDark ? "1" : "0");
  localStorage.setItem("theme_accent", accent);
}

const savedDark = localStorage.getItem("theme_dark") !== "0";
const savedAccent = localStorage.getItem("theme_accent") || "purple";

applyTheme(savedDark, savedAccent);

export const useThemeStore = create((set) => ({
  isDark: savedDark,
  accent: savedAccent,

  toggleMode: () =>
    set((state) => {
      const next = !state.isDark;
      applyTheme(next, state.accent);
      return { isDark: next };
    }),

  setAccent: (accent) =>
    set((state) => {
      applyTheme(state.isDark, accent);
      return { accent };
    }),
}));
