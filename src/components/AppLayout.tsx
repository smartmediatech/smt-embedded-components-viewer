import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sidebar } from "./Sidebar";
import { MobileTopBar, MobileTabBar } from "./MobileNav";

export const AppLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-ink">
        <div className="text-black dark:text-white text-xl font-semibold">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-neutral-100 dark:bg-ink">
      <Sidebar />
      <MobileTopBar />
      {/*
        No per-page topbar here on purpose — each embedded component owns its
        full-bleed layout (e.g. Marketplace's own dark, edge-to-edge design),
        and a duplicate title/gear bar above it doesn't exist in that design
        and only ate width/height that component wants for itself.
      */}
      {/* The bottom bar is fixed, so the scroll area reserves room for it. */}
      <main className="flex flex-col flex-1 min-w-0 overflow-auto pb-[calc(env(safe-area-inset-bottom,0px)+56px)] md:pb-0">
        <div className="flex flex-col flex-1 w-full h-full">
          <Outlet />
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
};
