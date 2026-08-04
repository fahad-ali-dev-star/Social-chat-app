export default function VerifiedBadge({ size = "sm", className = "" }) {
  const sizeClasses = {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  }[size] || "w-4 h-4";

  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 align-middle ${sizeClasses} ${className}`}
      aria-label="Verified User"
      title="Verified User"
    >
      {/* Blue starburst badge background */}
      <path
        fill="#1d9bf0"
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-.73.65-1.61.54-2.51-.17-1.42-1.25-2.5-2.67-2.67-.9-.11-1.78.08-2.51.54C14.75 2.71 13.51 1.83 12 1.83s-2.75.88-3.42 2.19c-.73-.46-1.61-.65-2.51-.54-1.42.17-2.5 1.25-2.67 2.67-.11.9.08 1.78.54 2.51C2.71 9.25 1.83 10.49 1.83 12s.88 2.75 2.19 3.42c-.46.73-.65 1.61-.54 2.51.17 1.42 1.25 2.5 2.67 2.67.9.11 1.78-.08 2.51-.54C9.25 21.29 10.49 22.17 12 22.17s2.75-.88 3.42-2.19c.73.46 1.61.65 2.51.54 1.42-.17 2.5-1.25 2.67-2.67.11-.9-.08-1.78-.54-2.51 1.31-.67 2.19-1.91 2.19-3.34z"
      />
      {/* White checkmark / tick */}
      <path
        fill="white"
        d="M10.54 16.2L6.8 12.46l1.41-1.42 2.33 2.33 5.86-5.86 1.41 1.41-7.27 7.28z"
      />
    </svg>
  );
}

