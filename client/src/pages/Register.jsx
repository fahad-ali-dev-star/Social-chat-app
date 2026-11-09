import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-rose-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];
  return { score, label: labels[score] || "", color: colors[score] || "" };
}

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const initials = useMemo(() => {
    const n = form.displayName || form.username;
    return n ? n.slice(0, 2).toUpperCase() : "?";
  }, [form.displayName, form.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 text-white font-black text-xl shadow-md overflow-hidden select-none"
            style={{ background: formData.displayName ? "var(--brand-gradient)" : "transparent" }}
          >
            {formData.displayName.trim() ? (
              initials
            ) : (
              <img src="/logo.svg" alt="BuzzChat Logo" className="w-full h-full object-cover" onError={(e) => { e.target.src = "/logo192.png"; }} />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Join Buzz Chat
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Create your profile and start connecting</p>
        </div>

        {/* Card */}
        <div className="glass-lg p-6 sm:p-8">
          {error && (
            <div className="mb-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold animate-fade-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Username</label>
                <input
                  id="reg-username"
                  required
                  placeholder="johndoe"
                  value={form.username}
                  onChange={update("username")}
                  className="field"
                  minLength={3}
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Display Name</label>
                <input
                  id="reg-displayname"
                  placeholder="John Doe"
                  value={form.displayName}
                  onChange={update("displayName")}
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email address</label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update("email")}
                className="field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <input
                id="reg-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={update("password")}
                className="field"
                minLength={6}
              />
              {form.password && (
                <div className="mt-2 animate-fade-in">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          i <= strength.score ? strength.color : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] mt-1 font-semibold ${
                    strength.score === 4 ? "text-emerald-500" :
                    strength.score >= 3 ? "text-blue-500" :
                    strength.score >= 2 ? "text-amber-500" : "text-rose-500"
                  }`}>
                    {strength.label} password
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-brand w-full py-2.5 mt-2 text-sm font-bold shadow-xs"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin mx-auto text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
