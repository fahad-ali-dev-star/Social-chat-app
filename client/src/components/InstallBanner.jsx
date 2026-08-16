import { useState, useEffect } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

const DISMISSED_KEY = "buzz_install_banner_dismissed";

// Detect iOS (Safari)
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

export default function InstallBanner() {
  const { canInstall, triggerInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    if (canInstall) {
      // Android / Chrome — native prompt available
      setVisible(true);
    } else if (isIOS()) {
      // iOS — show manual instructions
      setVisible(true);
      setShowIOSGuide(true);
    }
  }, [canInstall]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  const handleInstall = async () => {
    if (showIOSGuide) return; // iOS — user reads the guide
    await triggerInstall();
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "calc(100% - 32px)",
        maxWidth: 440,
        animation: "slideUpIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}
    >
      <style>{`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div className="glass-lg rounded-2xl p-4 flex items-start gap-3 shadow-2xl">
        {/* App Icon */}
        <img src="/logo192.png" alt="Buzz Chat" className="w-12 h-12 rounded-2xl flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">Install Buzz Chat</p>
          {showIOSGuide ? (
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Tap the{" "}
              <span className="inline-flex items-center gap-0.5 text-gray-300">
                <svg width="12" height="14" viewBox="0 0 24 28" fill="currentColor">
                  <path d="M12 1L7 6h3.5v10h3V6H17L12 1zm-8 16v8h16v-8h-2v6H6v-6H4z"/>
                </svg>
                Share
              </span>{" "}
              button then <strong className="text-gray-200">"Add to Home Screen"</strong>
            </p>
          ) : (
            <p className="text-gray-400 text-xs mt-1">
              Get the full app experience — works offline too!
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!showIOSGuide && (
            <button
              onClick={handleInstall}
              className="btn-brand text-xs px-3 py-1.5"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="icon-btn w-7 h-7 text-gray-500"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
