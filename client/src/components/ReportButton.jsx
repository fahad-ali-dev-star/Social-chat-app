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
      setDone(true); setOpen(false); setDetails("");
    } catch (e) {
      alert(e.response?.data?.message || "Could not submit report");
    } finally { setSending(false); }
  };

  if (done) return <span className={`text-[11px] text-emerald-400 ${className}`}>Reported ✓</span>;
  return (
    <div className={`relative ${className}`}>
      <button onClick={() => setOpen((v) => !v)} className="text-xs text-gray-400 hover:text-red-400 transition-colors">⚑ Report</button>
      {open && <div className="absolute right-0 bottom-full mb-2 w-64 glass-lg rounded-xl border border-white/10 shadow-xl p-3 z-50 space-y-2">
        <p className="text-xs font-semibold text-white">Report {targetType}</p>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="field text-xs py-2 w-full">{reasons.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</select>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} placeholder="Optional details…" className="field text-xs w-full resize-none" />
        <div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button><button onClick={submit} disabled={sending} className="btn-ghost text-xs text-red-400">{sending ? "Sending…" : "Submit report"}</button></div>
      </div>}
    </div>
  );
}
