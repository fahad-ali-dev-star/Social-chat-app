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
      {/* Circle outline */}
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="white"
        stroke="#1d9bf0"
        strokeWidth="2"
      />
      {/* Checkmark */}
      <path
        fill="none"
        stroke="#1d9bf0"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 12.5l3 3 8-8"
      />
    </svg>
  );
}
