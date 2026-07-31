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
  const colors = ["", "bg-red-500", "bg-amber-500", "bg-yellow-400", "bg-green-500"];
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-600/15 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md animate-slide-up relative z-10 px-1 sm:px-0">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Avatar preview */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}>
            {initials}
          </div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-gray-400 mt-1 text-sm">Join Nexus and connect with the world</p>
        </div>

        {/* Card */}
        <div className="glass-lg rounded-3xl p-4 sm:p-8">
          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
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
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Display Name</label>
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
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email address</label>
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
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
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
                          i <= strength.score ? strength.color : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${
                    strength.score === 4 ? "text-green-400" :
                    strength.score >= 3 ? "text-yellow-400" :
                    strength.score >= 2 ? "text-amber-400" : "text-red-400"
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-brand w-full py-3 mt-2"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
