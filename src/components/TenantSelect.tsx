import { Select } from "@base-ui/react/select";
import { CheckIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { TENANTS, type Tenant } from "../context/AppContext";

export const TenantSelect = () => {
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
        className="flex h-8 items-center justify-center gap-1.5 rounded-full border border-black/15 bg-black/5 px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer text-black hover:bg-black/10 focus-visible:outline-black/30 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:focus-visible:outline-white/50"
      >
        <Select.Value>
          {(value) => TENANTS[value as Tenant]?.label ?? ""}
        </Select.Value>
        <Select.Icon>
          <CaretUpDownIcon size={14} weight="bold" className="text-black/40 dark:text-white/50" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Select.Popup className="rounded-xl border border-black/10 bg-white/95 p-1 shadow-2xl shadow-black/10 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 dark:shadow-black/40 origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            {/* The deployed config.json decides which tenants exist, so there
                is no build-mode filtering here: a production config simply
                omits the localhost entry. */}
            {(Object.entries(TENANTS) as [Tenant, (typeof TENANTS)[Tenant]][])
              .map(([key, config]) => (
              <Select.Item
                key={key}
                value={key}
                disabled={config.disabled}
                className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-lg px-2 py-1.5 text-sm select-none outline-none text-black/60 data-[highlighted]:bg-black/5 data-[highlighted]:text-black dark:text-white/70 dark:data-[highlighted]:bg-white/10 dark:data-[highlighted]:text-white data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"
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
