import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-brand-500/20" />
            <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-400 text-xs font-semibold">Loading Buzz Chat…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
