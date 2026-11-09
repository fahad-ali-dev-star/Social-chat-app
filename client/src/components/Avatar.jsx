import { useMemo } from "react";

const GRADIENT_PALETTES = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-teal-500 to-emerald-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-cyan-600",
];

function getGradient(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENT_PALETTES[Math.abs(hash) % GRADIENT_PALETTES.length];
}

const SIZE_CLASSES = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 sm:w-14 sm:h-14 text-base",
  xl: "w-16 h-16 sm:w-20 sm:h-20 text-lg sm:text-xl",
};

const SIZE_PIXELS = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

/**
 * @param {{ src?: string, name?: string, username?: string, size?: "xs"|"sm"|"md"|"lg"|"xl", ring?: boolean, isOnline?: boolean, className?: string }} props
 */
export default function Avatar({ 
  src, 
  name, 
  username, 
  size = "md", 
  ring = false, 
  isOnline = false, 
  className = "" 
}) {
  const initials = useMemo(() => {
    const n = name || username || "?";
    return n.slice(0, 2).toUpperCase();
  }, [name, username]);

  const gradient = useMemo(() => getGradient(name || username), [name, username]);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const pixelSize = SIZE_PIXELS[size] || 40;

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${sizeClass} ${className}`}
      aria-label={name || username}
    >
      <div
        className={`w-full h-full aspect-square rounded-full overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white flex-shrink-0 ${
          ring ? "ring-2 ring-brand-500/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-900" : ""
        }`}
      >
        {src ? (
          <img
            src={src}
            alt={name || username}
            width={pixelSize}
            height={pixelSize}
            loading="eager"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            className="w-full h-full object-cover rounded-full block flex-shrink-0 pointer-events-none"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          initials
        )}
      </div>

      {isOnline && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs pointer-events-none"
          title="Online"
        />
      )}
    </div>
  );
}
