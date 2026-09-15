import { Select } from "@base-ui/react/select";
import { CheckIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { TENANTS, type Tenant } from "../context/AppContext";

interface TenantSelectProps {
  /** "dark" renders against a permanently-dark surface (the sidebar), independent of the app's light/dark theme toggle. */
  tone?: "light" | "dark";
}

export const TenantSelect = ({ tone = "light" }: TenantSelectProps = {}) => {
  const isDark = tone === "dark";
  const { tenant, setTenant } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /**
   * Each tenant authenticates against its own app id, so a session obtained for
   * one is not valid for another.
   *
   * Sign out through AuthContext rather than clearing tokens directly: the
   * context owns the `user` state that gates the routes, so dropping the tokens
   * behind its back leaves the app rendering as if signed in while every
   * `session.get` from an iframe fails with "Failed to refresh access token".
   */
  const changeTenant = async (next: Tenant) => {
    if (next === tenant) return;
    // Log out BEFORE switching. setTenant() swaps the app id authService signs
    // with, so switching first would send the logout (and any token refresh it
    // triggers) with the new tenant's app id — the platform rejects that as a
    // mismatch, so the old session is never invalidated server-side.
    if (user) {
      await logout();
      navigate("/login");
    }
    setTenant(next);
  };

  return (
    <Select.Root
      value={tenant}
      onValueChange={(value) => {
        if (value !== null) void changeTenant(value as Tenant);
      }}
    >
      <Select.Trigger
        aria-label="Select tenant"
        className={
          isDark
            ? "flex h-9 w-full items-center justify-center gap-1.5 rounded-sm border border-white/15 bg-white/5 px-3 font-display text-sm font-medium text-white transition-colors hover:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand cursor-pointer"
            : "flex h-8 items-center justify-center gap-1.5 rounded-sm border border-black/15 bg-white px-3 font-display text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer text-black hover:border-black/30 focus-visible:outline-brand dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:border-white/35 dark:focus-visible:outline-brand"
        }
      >
        <Select.Value>
          {(value) => TENANTS[value as Tenant]?.label ?? ""}
        </Select.Value>
        <Select.Icon>
          <CaretUpDownIcon
            size={14}
            weight="bold"
            className={isDark ? "text-white/50" : "text-black/40 dark:text-white/50"}
            aria-hidden="true"
          />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Select.Popup className="rounded-lg border border-black/10 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-ink origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            {/* The deployed config.json decides which tenants exist, so there
                is no build-mode filtering here: a production config simply
                omits the localhost entry. */}
            {(Object.entries(TENANTS) as [Tenant, (typeof TENANTS)[Tenant]][])
              .map(([key, config]) => (
              <Select.Item
                key={key}
                value={key}
                disabled={config.disabled}
                className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none outline-none text-black/60 data-[highlighted]:bg-brand/10 data-[highlighted]:text-black dark:text-white/70 dark:data-[highlighted]:bg-brand/20 dark:data-[highlighted]:text-white data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"
              >
                <Select.ItemIndicator className="col-start-1">
                  <CheckIcon size={14} weight="bold" aria-hidden="true" />
                </Select.ItemIndicator>
                <Select.ItemText className="col-start-2">
                  {config.label}
                  {config.disabled && (
                    <span className="ml-1.5 text-xs text-black/30 dark:text-white/30 normal-case tracking-normal">
                      (soon)
                    </span>
                  )}
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
};
