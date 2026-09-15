import { useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { SunIcon, MoonIcon, UserCircleIcon, BracketsAngleIcon } from "@phosphor-icons/react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApp, type BootMode } from "../context/AppContext";
import { LanguageSelect } from "./LanguageSelect";
import { TenantSelect } from "./TenantSelect";
import { COMPONENT_TABS, useActiveComponentTab } from "./componentTabs";

export const Sidebar = () => {
  const [loading, setLoading] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const { user, logout } = useAuth();
  const {
    language,
    theme,
    setTheme,
    explicitTheme,
    bootMode,
    setBootMode,
    suppressReferrer,
    setSuppressReferrer,
    senderAddress,
    setSenderAddress,
    senderAccountIndex,
    setSenderAccountIndex,
    componentHosts,
    componentHostKey,
    setComponentHostKey,
    smartComponentsHost,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  // Off by default so a plain visit never exposes internal testing knobs;
  // add ?devTools=1 to the URL to show the Dev menu.
  const devToolsEnabled = useMemo(
    () => new URLSearchParams(window.location.search).get("devTools") === "1",
    [],
  );
  const activeComponentTab = useActiveComponentTab();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="flex h-screen w-[248px] shrink-0 flex-col bg-ink text-white border-r border-white/[0.07]">
      {/* Brand */}
      <div className="px-5 py-5">
        <span className="font-display text-2xl leading-none">The Eagles</span>
      </div>

      {/* Environment / publisher */}
      <div className="px-4 pb-4">
        <TenantSelect tone="dark" />
      </div>

      <div className="border-t border-white/10" />

      {/* Component nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-[3px]">
          {COMPONENT_TABS.map((tab) => {
            const isActive =
              location.pathname === tab.path ||
              location.pathname === `/settings/${tab.path.slice(1)}`;
            const Icon = tab.Icon;

            return (
              <li key={tab.path}>
                <button
                  type="button"
                  onClick={() => navigate(tab.path)}
                  className={`flex w-full items-center gap-3 rounded-[11px] px-3 py-[11px] font-display text-[13.5px] font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-white/[0.07] text-white"
                      : "text-white/40 hover:bg-white/5 hover:text-white/70"
                  }`}
                >
                  <Icon size={18} weight={isActive ? "fill" : "regular"} className={isActive ? "text-brand" : undefined} aria-hidden="true" />
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer controls */}
      <div className="flex flex-col gap-2 border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-1.5">
          <LanguageSelect tone="dark" />

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-sm transition-colors cursor-pointer ${
              explicitTheme
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-white/30 hover:bg-white/5 hover:text-white/50"
            }`}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <SunIcon size={18} aria-hidden="true" /> : <MoonIcon size={18} aria-hidden="true" />}
          </button>

          {/* Dev menu — hidden unless ?devTools=1 is on the URL */}
          {devToolsEnabled && (
          <Popover.Root>
            <Popover.Trigger
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer data-[popup-open]:bg-brand data-[popup-open]:text-white"
              aria-label="Dev menu"
            >
              <BracketsAngleIcon size={18} weight="bold" aria-hidden="true" />
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Positioner side="top" align="start" sideOffset={12} className="z-50">
                <Popover.Popup className="w-auto min-w-56 rounded-lg border border-black/10 bg-white p-5 shadow-lg origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 dark:border-white/10 dark:bg-ink">
                  <Popover.Title className="font-display text-base font-semibold text-black dark:text-white">
                    Dev
                  </Popover.Title>

                  <div className="mt-4 space-y-3">
                    {Object.keys(componentHosts).length > 0 && (
                      <div>
                        <label className="block font-display text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50 mb-1.5">Components from</label>
                        <ToggleGroup
                          value={[componentHostKey ?? "tenant"]}
                          onValueChange={(value) => {
                            if (value.length === 0) return;
                            setComponentHostKey(value[0] === "tenant" ? null : value[0]);
                          }}
                          className="flex gap-1"
                        >
                          <Toggle
                            value="tenant"
                            className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-brand data-[pressed]:text-white dark:data-[pressed]:bg-brand dark:data-[pressed]:text-white"
                          >
                            Tenant
                          </Toggle>
                          {Object.keys(componentHosts).map((key) => (
                            <Toggle
                              key={key}
                              value={key}
                              className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-brand data-[pressed]:text-white dark:data-[pressed]:bg-brand dark:data-[pressed]:text-white"
                            >
                              {key}
                            </Toggle>
                          ))}
                        </ToggleGroup>
                        <p className="mt-1.5 break-all text-[11px] leading-tight text-black/40 dark:text-white/40">
                          {smartComponentsHost}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block font-display text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50 mb-1.5">Boot mode</label>
                      <ToggleGroup
                        value={[bootMode]}
                        onValueChange={(value) => {
                          if (value.length > 0) setBootMode(value[0] as BootMode);
                        }}
                        className="flex gap-1"
                      >
                        <Toggle
                          value="access-token"
                          className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-brand data-[pressed]:text-white dark:data-[pressed]:bg-brand dark:data-[pressed]:text-white"
                        >
                          Access Token
                        </Toggle>
                        <Toggle
                          value="refresh-token"
                          className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-brand data-[pressed]:text-white dark:data-[pressed]:bg-brand dark:data-[pressed]:text-white"
                        >
                          Refresh Token
                        </Toggle>
                      </ToggleGroup>
                    </div>
                    <div>
                      <label className="block font-display text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50 mb-1.5">Referrer</label>
                      <ToggleGroup
                        value={[suppressReferrer ? "none" : "send"]}
                        onValueChange={(value) => {
                          if (value.length > 0) setSuppressReferrer(value[0] === "none");
                        }}
                        className="flex gap-1"
                      >
                        <Toggle
                          value="send"
                          className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-brand data-[pressed]:text-white dark:data-[pressed]:bg-brand dark:data-[pressed]:text-white"
                        >
                          Send
                        </Toggle>
                        <Toggle
                          value="none"
                          className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-brand data-[pressed]:text-white dark:data-[pressed]:bg-brand dark:data-[pressed]:text-white"
                        >
                          No Referrer
                        </Toggle>
                      </ToggleGroup>
                    </div>
                    <div>
                      <label className="block font-display text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50 mb-1.5">
                        Sender (wallet.address.get)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={senderAddress}
                          onChange={(event) => setSenderAddress(event.target.value)}
                          placeholder="0x…"
                          spellCheck={false}
                          className="min-w-0 flex-1 rounded-sm border border-black/10 bg-white px-2 py-1.5 font-mono text-xs text-black placeholder:text-black/30 focus:outline-none focus:border-brand dark:border-white/10 dark:bg-transparent dark:text-white dark:placeholder:text-white/30"
                        />
                        <input
                          type="number"
                          value={senderAccountIndex}
                          onChange={(event) => setSenderAccountIndex(Number(event.target.value) || 0)}
                          aria-label="Sender account index"
                          className="w-14 rounded-sm border border-black/10 bg-white px-2 py-1.5 text-xs text-black focus:outline-none focus:border-brand dark:border-white/10 dark:bg-transparent dark:text-white"
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] leading-tight text-black/40 dark:text-white/40">
                        Answers a resale/marketplace component&apos;s{" "}
                        <code className="font-mono">wallet.address.get</code> bridge request. Empty fails the
                        request so the component can surface a clear error.
                      </p>
                    </div>

                    {activeComponentTab?.Settings && (
                      <div className="pt-3 border-t border-black/10 dark:border-white/10">
                        <label className="block font-display text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50 mb-1.5">
                          {activeComponentTab.label} settings
                        </label>
                        <activeComponentTab.Settings />
                      </div>
                    )}
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          )}
        </div>

        {/* Account */}
        <Popover.Root>
          <Popover.Trigger
            className="flex w-full items-center gap-[11px] rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/5 cursor-pointer data-[popup-open]:bg-white/10"
            aria-label="Account menu"
          >
            {user?.avatarUri && !avatarFailed ? (
              <img
                src={user.avatarUri}
                alt=""
                aria-hidden="true"
                onError={() => setAvatarFailed(true)}
                className="h-[34px] w-[34px] shrink-0 rounded-full border border-white/[0.18] bg-[#1a1820] object-cover"
              />
            ) : (
              <UserCircleIcon size={34} weight="fill" className="shrink-0 text-white/70" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[12.5px] font-bold text-white">
                {user?.name}
              </span>
              <span className="block truncate text-[10.5px] text-white/50 mt-0.5">{user?.email}</span>
            </span>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Positioner side="top" align="start" sideOffset={12} className="z-50">
              <Popover.Popup className="w-64 rounded-lg border border-black/10 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-ink origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
                <Popover.Title className="font-display text-base font-semibold text-black dark:text-white">
                  {user?.name}
                </Popover.Title>
                {user?.email && (
                  <p className="text-sm text-black/50 dark:text-white/50 mt-1">{user.email}</p>
                )}
                <p className="text-sm text-black/40 dark:text-white/40 mt-1">{language}</p>
                {user?.id && (
                  <p className="font-mono text-xs text-black/30 dark:text-white/30 mt-2">{user.id}</p>
                )}

                <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 flex justify-end">
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? "Logging out…" : "Logout"}
                  </button>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </aside>
  );
};
