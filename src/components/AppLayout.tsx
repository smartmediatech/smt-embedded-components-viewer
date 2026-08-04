import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppHeader } from "./AppHeader";

export const AppLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-black dark:text-white text-xl font-semibold">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 dark:bg-black">
      <AppHeader />
      <main className="flex flex-col flex-1 p-4 h-full">
        <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
