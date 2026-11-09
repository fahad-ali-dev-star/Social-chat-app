import { useState } from "react";
import api from "../api/client";

const reasons = ["spam", "harassment", "hate", "violence", "scam", "impersonation", "sexual_content", "other"];

export default function ReportButton({ targetType, targetId, className = "" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await api.post("/reports", { targetType, targetId, reason, details });
      setDone(true);
      setOpen(false);
      setDetails("");
    } catch (e) {
      alert(e.response?.data?.message || "Could not submit report");
    } finally {
      setSending(false);
    }
  };

  if (done) return <span className={`text-[10px] text-emerald-500 font-semibold ${className}`}>Reported ✓</span>;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors font-medium flex items-center gap-1"
      >
        <span>⚑</span> Report
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-64 glass-lg rounded-2xl shadow-popover p-3.5 z-50 space-y-2.5 animate-slide-up">
          <p className="text-xs font-bold text-slate-900 dark:text-white">Report {targetType}</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field text-xs py-1.5 w-full capitalize"
          >
            {reasons.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Provide context (optional)…"
            className="field text-xs w-full resize-none"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setOpen(false)} className="btn-ghost text-xs py-1 px-2.5">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={sending}
              className="btn-ghost text-xs py-1 px-2.5 text-rose-500 font-bold"
            >
              {sending ? "Sending…" : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
