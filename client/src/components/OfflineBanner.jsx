import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const goOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        animation: "fadeSlideDown 0.3s ease both",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div
        className="rounded-full px-4 py-2 flex items-center gap-2 text-xs font-semibold shadow-2xl"
        style={{
          background: isOnline ? "#16a34a" : "#dc2626",
          color: "#fff",
          backdropFilter: "blur(12px)",
          boxShadow: isOnline
            ? "0 4px 20px rgba(22, 163, 74, 0.5)"
            : "0 4px 20px rgba(220, 38, 38, 0.5)",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.9,
            display: "inline-block",
            animation: isOnline ? "none" : "pulse 1.4s infinite",
          }}
        />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        {isOnline ? "✓ Back online" : "No internet connection"}
      </div>
    </div>
  );
}
