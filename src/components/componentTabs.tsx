import { useMemo, type ComponentType } from "react";
import { useLocation } from "react-router-dom";
import {
  CompassIcon,
  TicketIcon,
  StackIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { ComponentSettings } from "./ComponentSettings";

export interface ComponentTab {
  path: string;
  label: string;
  Icon: PhosphorIcon;
  Settings: ComponentType | null;
}

/**
 * Only the three pages the Eagles Ticket Club design actually has (its own
 * nav is exactly Discover/Collection/Marketplace) are shown here. Rewards,
 * Challenges, Giveaways and Map still exist as routes/components — they're
 * just not part of this design, so they're not surfaced in the nav. The
 * profile is reached from the account button, not a tab.
 */
export const COMPONENT_TABS: ComponentTab[] = [
  { path: "/discover", label: "Discover", Icon: CompassIcon, Settings: ComponentSettings },
  { path: "/collection", label: "Collection", Icon: StackIcon, Settings: ComponentSettings },
  { path: "/marketplace", label: "Marketplace", Icon: TicketIcon, Settings: ComponentSettings },
];

/** Matches the current route to a nav tab, including its `/settings/:tab` alias. */
export function useActiveComponentTab(): ComponentTab | null {
  const location = useLocation();

  return useMemo(() => {
    const componentTab = COMPONENT_TABS.find((tab) => tab.path === location.pathname);
    if (componentTab) return componentTab;

    const settingsMatch = location.pathname.match(/^\/settings\/([^/]+)$/);
    if (!settingsMatch) return null;

    return (
      COMPONENT_TABS.find((tab) => tab.path === `/${settingsMatch[1].toLowerCase()}`) ?? null
    );
  }, [location.pathname]);
}
