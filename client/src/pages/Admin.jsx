import { useEffect, useState } from "react";
import api from "../api/client";

const statusOptions = ["pending", "reviewing", "resolved", "dismissed"];

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("overview");
  const [reportStatus, setReportStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = async () => { const { data } = await api.get("/admin/stats"); setStats(data.stats); };
  const loadReports = async () => { const { data } = await api.get(`/admin/reports?status=${reportStatus}`); setReports(data.reports || []); };
  const loadUsers = async () => { const { data } = await api.get("/admin/users"); setUsers(data.users || []); };

  useEffect(() => {
    setLoading(true); setError("");
    Promise.all([loadStats(), loadReports(), loadUsers()]).catch((e) => setError(e.response?.data?.message || "Failed to load admin data")).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadReports().catch(() => {}); }, [reportStatus]);

  const updateReport = async (id, status) => {
    try { await api.patch(`/admin/reports/${id}`, { status }); await loadReports(); await loadStats(); }
    catch (e) { setError(e.response?.data?.message || "Failed to update report"); }
  };

  const updateUser = async (id, patch) => {
    try {
      const { data } = await api.patch(`/admin/users/${id}`, patch);
      setUsers((list) => list.map((u) => u._id === id ? data.user : u));
      await loadStats();
    } catch (e) { setError(e.response?.data?.message || "Failed to update user"); }
  };

  const deleteContent = async (report) => {
    if (!window.confirm(`Delete this ${report.targetType}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/content/${report.targetType}/${report.targetId}`);
      await api.patch(`/admin/reports/${report._id}`, { status: "resolved", resolution: "Content removed by moderator" });
      await loadReports(); await loadStats();
    } catch (e) { setError(e.response?.data?.message || "Failed to remove content"); }
  };

  if (loading) return <div className="max-w-6xl mx-auto p-6 text-gray-400">Loading admin dashboard…</div>;
  if (error && !stats) return <div className="max-w-3xl mx-auto p-6 text-red-400">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-white">Admin Dashboard</h1><p className="text-sm text-gray-500">Moderation, users and platform health</p></div>
        <div className="flex gap-2">
          {["overview", "reports", "users"].map((x) => <button key={x} onClick={() => setTab(x)} className={`btn-ghost capitalize ${tab === x ? "bg-white/10 text-white" : ""}`}>{x}</button>)}
        </div>
      </div>
      {error && <div className="glass rounded-xl p-3 text-sm text-red-300">{error}</div>}

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(stats).map(([key, value]) => <div key={key} className="glass rounded-2xl p-4"><p className="text-xs uppercase tracking-wide text-gray-500">{key.replace(/([A-Z])/g, " $1")}</p><p className="text-2xl font-bold text-white mt-1">{value.toLocaleString()}</p></div>)}
        </div>
      )}

      {tab === "reports" && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/8 flex flex-wrap gap-2">{statusOptions.map((s) => <button key={s} onClick={() => setReportStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs capitalize ${reportStatus === s ? "bg-brand-600/30 text-brand-300" : "bg-white/5 text-gray-400"}`}>{s}</button>)}</div>
          <div className="divide-y divide-white/5">
            {reports.length === 0 ? <p className="p-8 text-center text-gray-500">No {reportStatus} reports.</p> : reports.map((r) => (
              <div key={r._id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-sm text-white font-semibold">{r.targetType} · {r.reason}</p><p className="text-xs text-gray-500">Reported by @{r.reporter?.username || "unknown"} · {new Date(r.createdAt).toLocaleString()}</p></div>
                  <span className="text-[10px] uppercase rounded-full bg-white/5 px-2 py-1 text-gray-400">{r.status}</span>
                </div>
                {r.details && <p className="text-sm text-gray-300 bg-white/5 rounded-xl p-3">{r.details}</p>}
                <div className="flex flex-wrap gap-2">
                  {r.status !== "reviewing" && <button onClick={() => updateReport(r._id, "reviewing")} className="btn-ghost text-xs">Review</button>}
                  {(r.targetType !== "user" && r.status !== "resolved") && <button onClick={() => deleteContent(r)} className="btn-ghost text-xs text-red-400">Delete content</button>}
                  {r.status !== "resolved" && <button onClick={() => updateReport(r._id, "resolved")} className="btn-ghost text-xs text-emerald-400">Resolve</button>}
                  {r.status !== "dismissed" && <button onClick={() => updateReport(r._id, "dismissed")} className="btn-ghost text-xs">Dismiss</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="glass rounded-2xl overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs text-gray-500 uppercase"><tr><th className="text-left p-3">User</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th><th className="text-left p-3">Verified</th><th className="p-3">Actions</th></tr></thead><tbody className="divide-y divide-white/5">
          {users.map((u) => <tr key={u._id}><td className="p-3"><p className="font-semibold text-white">{u.displayName || u.username}</p><p className="text-xs text-gray-500">@{u.username}</p></td><td className="p-3"><select value={u.role} onChange={(e) => updateUser(u._id, { role: e.target.value })} className="field text-xs py-1"><option value="user">user</option><option value="moderator">moderator</option><option value="admin">admin</option></select></td><td className="p-3"><select value={u.accountStatus} onChange={(e) => updateUser(u._id, { accountStatus: e.target.value })} className="field text-xs py-1"><option value="active">active</option><option value="suspended">suspended</option><option value="banned">banned</option></select></td><td className="p-3"><button onClick={() => updateUser(u._id, { isVerified: !u.isVerified })} className={`text-xs ${u.isVerified ? "text-brand-400" : "text-gray-500"}`}>{u.isVerified ? "Verified ✓" : "Not verified"}</button></td><td className="p-3 text-center"><button onClick={() => updateUser(u._id, { accountStatus: u.accountStatus === "active" ? "suspended" : "active" })} className="btn-ghost text-xs">{u.accountStatus === "active" ? "Suspend" : "Activate"}</button></td></tr>)}
        </tbody></table></div>
      )}
    </div>
  );
}
