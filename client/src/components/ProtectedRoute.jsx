import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-brand-500/30" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-500 text-sm animate-pulse">Loading Nexus…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
