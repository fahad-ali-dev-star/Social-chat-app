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

  const loadStats = async () => {
    const { data } = await api.get("/admin/stats");
    setStats(data.stats);
  };
  const loadReports = async () => {
    const { data } = await api.get(`/admin/reports?status=${reportStatus}`);
    setReports(data.reports || []);
  };
  const loadUsers = async () => {
    const { data } = await api.get("/admin/users");
    setUsers(data.users || []);
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([loadStats(), loadReports(), loadUsers()])
      .catch((e) => setError(e.response?.data?.message || "Failed to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadReports().catch(() => {});
  }, [reportStatus]);

  const updateReport = async (id, status) => {
    try {
      await api.patch(`/admin/reports/${id}`, { status });
      await loadReports();
      await loadStats();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update report");
    }
  };

  const updateUser = async (id, patch) => {
    try {
      const { data } = await api.patch(`/admin/users/${id}`, patch);
      setUsers((list) => list.map((u) => (u._id === id ? data.user : u)));
      await loadStats();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update user");
    }
  };

  const deleteContent = async (report) => {
    if (!window.confirm(`Delete this ${report.targetType}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/content/${report.targetType}/${report.targetId}`);
      await api.patch(`/admin/reports/${report._id}`, { status: "resolved", resolution: "Content removed by moderator" });
      await loadReports();
      await loadStats();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to remove content");
    }
  };

  if (loading) return <div className="max-w-6xl mx-auto p-6 text-slate-400">Loading admin dashboard…</div>;
  if (error && !stats) return <div className="max-w-3xl mx-auto p-6 text-rose-500 font-medium">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 sm:pb-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-xs text-slate-400">Platform metrics, user management, and moderation</p>
        </div>
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {["overview", "reports", "users"].map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all ${
                tab === x
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {x}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="glass p-3 text-sm text-rose-500">{error}</div>}

      {/* Overview Tab */}
      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="glass p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {key.replace(/([A-Z])/g, " $1")}
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
                {value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Reports Tab */}
      {tab === "reports" && (
        <div className="glass overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setReportStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  reportStatus === s
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reports.length === 0 ? (
              <p className="p-10 text-center text-xs text-slate-400">No {reportStatus} reports found.</p>
            ) : (
              reports.map((r) => (
                <div key={r._id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {r.targetType} · {r.reason}
                      </p>
                      <p className="text-xs text-slate-400">
                        Reported by @{r.reporter?.username || "unknown"} · {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-500">
                      {r.status}
                    </span>
                  </div>
                  {r.details && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 rounded-xl p-3">
                      {r.details}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {r.status !== "reviewing" && (
                      <button onClick={() => updateReport(r._id, "reviewing")} className="btn-ghost text-xs py-1 px-3">
                        Review
                      </button>
                    )}
                    {r.targetType !== "user" && r.status !== "resolved" && (
                      <button onClick={() => deleteContent(r)} className="btn-ghost text-xs py-1 px-3 text-rose-500">
                        Delete content
                      </button>
                    )}
                    {r.status !== "resolved" && (
                      <button onClick={() => updateReport(r._id, "resolved")} className="btn-ghost text-xs py-1 px-3 text-emerald-500">
                        Resolve
                      </button>
                    )}
                    {r.status !== "dismissed" && (
                      <button onClick={() => updateReport(r._id, "dismissed")} className="btn-ghost text-xs py-1 px-3">
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="glass overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Verified</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{u.displayName || u.username}</p>
                    <p className="text-[11px] text-slate-400">@{u.username}</p>
                  </td>
                  <td className="p-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u._id, { role: e.target.value })}
                      className="field text-xs py-1 w-28"
                    >
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="p-3.5">
                    <select
                      value={u.accountStatus}
                      onChange={(e) => updateUser(u._id, { accountStatus: e.target.value })}
                      className="field text-xs py-1 w-28"
                    >
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                      <option value="banned">banned</option>
                    </select>
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => updateUser(u._id, { isVerified: !u.isVerified })}
                      className={`text-xs font-semibold ${u.isVerified ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}
                    >
                      {u.isVerified ? "Verified ✓" : "Not verified"}
                    </button>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => updateUser(u._id, { accountStatus: u.accountStatus === "active" ? "suspended" : "active" })}
                      className="btn-ghost text-xs py-1 px-3"
                    >
                      {u.accountStatus === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
