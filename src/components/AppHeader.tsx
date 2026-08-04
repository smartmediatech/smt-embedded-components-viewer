import { useState, type ComponentType } from "react";
import { GearIcon, XIcon, SunIcon, MoonIcon, UserCircleIcon, BracketsAngleIcon } from "@phosphor-icons/react";
import { Popover } from "@base-ui/react/popover";
import { Tabs } from "@base-ui/react/tabs";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApp, type BootMode } from "../context/AppContext";
import { LanguageSelect } from "./LanguageSelect";
import { TenantSelect } from "./TenantSelect";
import { MapSettings } from "./MapSettings";
import { ComponentSettings } from "./ComponentSettings";

const COMPONENT_TABS: { path: string; label: string; Settings: ComponentType | null }[] = [
  { path: "/discover", label: "Discover", Settings: ComponentSettings },
  { path: "/rewards", label: "Rewards", Settings: ComponentSettings },
  { path: "/challenges", label: "Challenges", Settings: ComponentSettings },
  { path: "/giveaways", label: "Giveaways", Settings: ComponentSettings },
  { path: "/map", label: "Map", Settings: MapSettings },
];

export const AppHeader = () => {
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { theme, setTheme, explicitTheme, language, bootMode, setBootMode, suppressReferrer, setSuppressReferrer,
          componentHosts, componentHostKey, setComponentHostKey, smartComponentsHost } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const activeComponentTab = (() => {
    const componentTab = COMPONENT_TABS.find(
      (tab) => tab.path === location.pathname,
    );

    if (componentTab) {
      return componentTab;
    }

    const settingsMatch = location.pathname.match(/^\/settings\/([^/]+)$/);
    if (!settingsMatch) {
      return null;
    }

    return (
      COMPONENT_TABS.find(
        (tab) => tab.path === `/${settingsMatch[1].toLowerCase()}`,
      ) ?? null
    );
  })();


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
    <header className="relative z-20 bg-white border-b border-black/10 dark:bg-black dark:border-white/10">
      {/* Primary bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
        {/* Left — tenant selector */}
        <div className="flex-1 flex items-center">
          <TenantSelect />
        </div>


        {/* Right actions */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <LanguageSelect />
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              explicitTheme
                ? "text-black/50 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                : "text-black/25 hover:bg-black/5 hover:text-black/50 dark:text-white/25 dark:hover:bg-white/5 dark:hover:text-white/50"
            }`}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <SunIcon size={18} aria-hidden="true" /> : <MoonIcon size={18} aria-hidden="true" />}
          </button>

          {/* Dev menu */}
          <Popover.Root>
            <Popover.Trigger
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer data-[popup-open]:bg-black data-[popup-open]:text-white dark:data-[popup-open]:bg-white dark:data-[popup-open]:text-black"
              aria-label="Dev menu"
            >
              <BracketsAngleIcon size={18} weight="bold" aria-hidden="true" />
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Positioner side="bottom" align="end" sideOffset={12} className="z-50">
                <Popover.Popup className="w-auto min-w-56 rounded-2xl border border-black/10 bg-white/95 p-5 shadow-2xl shadow-black/10 backdrop-blur origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 dark:border-white/10 dark:bg-neutral-950/95 dark:shadow-black/40">
                  <Popover.Title className="text-base font-semibold text-black dark:text-white">
                    Dev
                  </Popover.Title>

                  <div className="mt-4 space-y-3">
                    {Object.keys(componentHosts).length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-1.5">Components from</label>
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
                            className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-black data-[pressed]:text-white dark:data-[pressed]:bg-white dark:data-[pressed]:text-black"
                          >
                            Tenant
                          </Toggle>
                          {Object.keys(componentHosts).map((key) => (
                            <Toggle
                              key={key}
                              value={key}
                              className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-black data-[pressed]:text-white dark:data-[pressed]:bg-white dark:data-[pressed]:text-black"
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
                      <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-1.5">Boot mode</label>
                      <ToggleGroup
                        value={[bootMode]}
                        onValueChange={(value) => {
                          if (value.length > 0) setBootMode(value[0] as BootMode);
                        }}
                        className="flex gap-1"
                      >
                        <Toggle
                          value="access-token"
                          className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-black data-[pressed]:text-white dark:data-[pressed]:bg-white dark:data-[pressed]:text-black"
                        >
                          Access Token
                        </Toggle>
                        <Toggle
                          value="refresh-token"
                          className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-black data-[pressed]:text-white dark:data-[pressed]:bg-white dark:data-[pressed]:text-black"
                        >
                          Refresh Token
                        </Toggle>
                      </ToggleGroup>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-black/50 dark:text-white/50 mb-1.5">Referrer</label>
                      <ToggleGroup
                        value={[suppressReferrer ? "none" : "send"]}
                        onValueChange={(value) => {
                          if (value.length > 0) setSuppressReferrer(value[0] === "none");
                        }}
                        className="flex gap-1"
                      >
                        <Toggle
                          value="send"
                          className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-black data-[pressed]:text-white dark:data-[pressed]:bg-white dark:data-[pressed]:text-black"
                        >
                          Send
                        </Toggle>
                        <Toggle
                          value="none"
                          className="flex-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10 data-[pressed]:bg-black data-[pressed]:text-white dark:data-[pressed]:bg-white dark:data-[pressed]:text-black"
                        >
                          No Referrer
                        </Toggle>
                      </ToggleGroup>
                    </div>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>

          {/* Avatar / account menu */}
          <Popover.Root>
            <Popover.Trigger
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer data-[popup-open]:bg-black data-[popup-open]:text-white dark:data-[popup-open]:bg-white dark:data-[popup-open]:text-black"
              aria-label="Account menu"
            >
              <UserCircleIcon size={22} weight="fill" aria-hidden="true" />
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Positioner side="bottom" align="end" sideOffset={12} className="z-50">
                <Popover.Popup className="w-auto min-w-64 max-w-sm rounded-2xl border border-black/10 bg-white/95 p-5 shadow-2xl shadow-black/10 backdrop-blur origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 dark:border-white/10 dark:bg-neutral-950/95 dark:shadow-black/40">
                  <div className="text-right">
                    <Popover.Title className="text-base font-semibold text-black dark:text-white">
                      {user?.name}
                    </Popover.Title>
                    {user?.email && (
                      <p className="text-sm text-black/50 dark:text-white/50 mt-1">{user.email}</p>
                    )}
                    <p className="text-sm text-black/40 dark:text-white/40 mt-1">{language}</p>
                    {user?.id && (
                      <p className="font-mono text-xs text-black/30 dark:text-white/30 mt-2">{user.id}</p>
                    )}
                  </div>

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
      </div>

      {/* Component nav */}
      <div className="border-t border-black/10 dark:border-white/10">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div />

            {activeComponentTab ? (
              <Tabs.Root
                value={activeComponentTab.path}
                onValueChange={(value) => {
                  if (value !== activeComponentTab.path) navigate(value as string);
                }}
              >
                <Tabs.List className="flex flex-wrap items-center justify-center gap-1">
                  {COMPONENT_TABS.map((tab) => (
                    <Tabs.Tab
                      key={tab.path}
                      value={tab.path}
                      className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer text-black/60 hover:text-black hover:bg-black/5 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 data-[active]:bg-black data-[active]:text-white dark:data-[active]:bg-white dark:data-[active]:text-black"
                    >
                      {tab.label}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.Root>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-1">
                {COMPONENT_TABS.map((tab) => (
                  <button
                    key={tab.path}
                    className="px-4 py-1.5 rounded-full text-sm font-medium text-black/60 dark:text-white/70"
                    tabIndex={-1}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              {activeComponentTab && (
                <Popover.Root>
                  <Popover.Trigger
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer text-black/50 hover:bg-black/5 hover:text-black data-[popup-open]:bg-black data-[popup-open]:text-white dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white dark:data-[popup-open]:bg-white dark:data-[popup-open]:text-black"
                    aria-label={`${activeComponentTab.label} settings`}
                  >
                    <GearIcon size={20} weight="regular" aria-hidden="true" />
                  </Popover.Trigger>

                  <Popover.Portal>
                    <Popover.Positioner side="bottom" align="end" sideOffset={12} className="z-50">
                      <Popover.Popup className="w-80 rounded-2xl border border-black/10 bg-white/95 p-5 shadow-2xl shadow-black/10 backdrop-blur origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 dark:border-white/10 dark:bg-neutral-950/95 dark:shadow-black/40">
                        <div className="flex items-start justify-between gap-4">
                          <Popover.Title className="text-base font-semibold text-black dark:text-white">
                            {activeComponentTab.label}
                          </Popover.Title>

                          <Popover.Close className="inline-flex h-7 w-7 items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer">
                            <XIcon size={14} weight="bold" aria-hidden="true" />
                          </Popover.Close>
                        </div>

                        {(() => {
                          const { Settings } = activeComponentTab;
                          return Settings ? (
                            <Settings />
                          ) : (
                            <div className="mt-4 rounded-xl border border-dashed border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03] px-4 py-3">
                              <p className="text-sm text-black/40 dark:text-white/40">
                                No settings available for {activeComponentTab.label.toLowerCase()} yet.
                              </p>
                            </div>
                          );
                        })()}
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
