import { useMemo } from "react";

const GRADIENT_PALETTES = [
  "from-violet-500 to-purple-700",
  "from-blue-500 to-indigo-700",
  "from-pink-500 to-rose-700",
  "from-teal-500 to-cyan-700",
  "from-amber-500 to-orange-700",
];

function getGradient(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENT_PALETTES[Math.abs(hash) % GRADIENT_PALETTES.length];
}

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

  const sizeClasses = {
    xs:  "w-6 h-6 text-[9px]",
    sm:  "w-8 h-8 text-xs",
    md:  "w-10 h-10 text-sm",
    lg:  "w-14 h-14 text-lg",
    xl:  "w-20 h-20 text-2xl",
  };

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white flex-shrink-0 ${ring ? "ring-2 ring-brand-500/60 ring-offset-2 ring-offset-surface-900" : ""} ${className}`}
        aria-label={name || username}
      >
        {src ? (
          <img
            src={src}
            alt={name || username}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          initials
        )}
      </div>

      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface-950 shadow-sm" title="Online" />
      )}
    </div>
  );
}
