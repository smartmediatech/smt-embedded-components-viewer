import { UserCircleIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { COMPONENT_TABS, useActiveComponentTab } from "./componentTabs";

/**
 * Phone navigation: a slim brand bar on top and a tab bar at the bottom,
 * as the design lays it out at phone width.
 *
 * It exists because the desktop rail is a fixed 248px with no breakpoint —
 * on a 390px phone that leaves 142px for the component itself, which is less
 * than a ticket row needs. Below `md` the rail is hidden and the same
 * COMPONENT_TABS drive these instead, so the two navigations can't drift.
 */

export const MobileTopBar = () => {
  const { user } = useAuth();
  const avatarUrl = user?.avatarUri;

  return (
    <header
      className="md:hidden flex items-center justify-between gap-3 bg-ink text-white border-b border-white/[0.07] px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: "12px" }}
    >
      <span className="font-display text-[19px] leading-none">The Eagles</span>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          aria-hidden="true"
          className="h-[30px] w-[30px] shrink-0 rounded-full border border-white/[0.18] bg-[#1a1820] object-cover"
        />
      ) : (
        <UserCircleIcon size={30} weight="fill" className="shrink-0 text-white/70" aria-hidden="true" />
      )}
    </header>
  );
};

export const MobileTabBar = () => {
  const navigate = useNavigate();
  const activeTab = useActiveComponentTab();

  return (
    <nav
      aria-label="Sections"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch bg-ink border-t border-white/[0.07]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {COMPONENT_TABS.map(({ path, label, Icon }) => {
        const isActive = activeTab?.path === path;

        return (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            aria-current={isActive ? "page" : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px]"
          >
            <Icon
              size={20}
              weight={isActive ? "fill" : "regular"}
              className={isActive ? "text-brand" : "text-white/55"}
              aria-hidden="true"
            />
            <span className={`text-[11px] leading-none ${isActive ? "text-white" : "text-white/55"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
