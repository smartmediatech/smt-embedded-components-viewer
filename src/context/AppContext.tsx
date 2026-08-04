import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { BridgedIframeHandle } from "../components/BridgedIframe";
import {
  getViewerConfig,
  setActiveTenant,
  type MapComponentConfig,
  type ViewerTenant,
} from "../config/viewerConfig";

/**
 * Tenants, hosts and the map theme all come from the runtime config
 * (`public/config.json`); this repo's source carries no customer identifiers.
 * A tenant entry is just `{ label, smartComponentsHost, fqdn }` — the hostname
 * carries the environment, `?fqdn=` carries the publisher.
 */
export type Tenant = string;
export type TenantConfig = ViewerTenant;

export type { MapComponentConfig };

export const TENANTS: Record<Tenant, TenantConfig> = getViewerConfig().tenants;

/** Survives reloads on purpose — see componentHostKey in AppProvider. */
const COMPONENT_HOST_KEY = "smt-viewer:componentHost";

const MAP_THEMES: Record<"light" | "dark", MapComponentConfig> =
  getViewerConfig().mapTheme;

export type Theme = "light" | "dark";

export type MapQueryParams = {
  lat?: number;
  lon?: number;
  zoom?: number;
};

export type PendingMapCommand =
  | {
      type: "viewport";
      center: {
        latitude: number;
        longitude: number;
      };
      zoom?: number;
    }
  | {
      type: "user-location";
      zoom?: number;
    };

export type BootMode = "access-token" | "refresh-token";

interface AppContextType {
  language: string;
  setLanguage: (language: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  tenant: Tenant;
  setTenant: (tenant: Tenant) => void;
  bootMode: BootMode;
  setBootMode: (mode: BootMode) => void;
  suppressReferrer: boolean;
  setSuppressReferrer: (suppress: boolean) => void;
  /** Labelled component hosts from config; empty when the config declares none. */
  componentHosts: Record<string, string>;
  /** Active override key, or null to use the tenant's own host. */
  componentHostKey: string | null;
  setComponentHostKey: (key: string | null) => void;
  smartComponentsHost: string;
  legacyComponentsHost: string;
  mapComponentConfig: MapComponentConfig;
  mapQueryParams: MapQueryParams;
  setMapQueryParams: (params: MapQueryParams) => void;
  pendingMapCommand: PendingMapCommand | null;
  setPendingMapCommand: (command: PendingMapCommand | null) => void;
  clearPendingMapCommand: () => void;
  mapIframeHandle: BridgedIframeHandle | null;
  setMapIframeHandle: (handle: BridgedIframeHandle | null) => void;
  currentIframeUrl: string | null;
  setCurrentIframeUrl: (url: string | null) => void;
  /** The lang/theme values currently present in component URLs (null = not yet set). */
  explicitLang: string | null;
  explicitTheme: Theme | null;
  /** Appends only explicitly-set params (lang, theme) plus any extra params to a base URL. */
  appendUrlParams: (base: string, extra?: Record<string, string | undefined>) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [language, setLanguageState] = useState("en");
  const [theme, setThemeState] = useState<Theme>("dark");
  // loadViewerConfig() already seeded the active tenant, so this initializer is
  // pure — no side effect during render, and no dependence on provider order.
  const [tenant, setTenantState] = useState<Tenant>(
    () => getViewerConfig().defaultTenant,
  );

  /**
   * Switching tenant switches the app id the viewer authenticates with, so any
   * existing session belongs to a different app.
   *
   * Signing the user out is deliberately NOT done here: AuthContext owns the
   * `user` state that gates the routes, and clearing tokens behind it would
   * leave the app rendering as if signed in while every bridge `session.get`
   * failed. TenantSelect calls AuthContext.logout() alongside this.
   */
  const setTenant = useCallback(
    (next: Tenant) => {
      if (next === tenant) return;
      setActiveTenant(next);
      setTenantState(next);
    },
    [tenant],
  );
  const componentHosts = getViewerConfig().componentHosts ?? {};

  /**
   * Which host serves the components, independent of which tenant is selected.
   *
   * Persisted, unlike the other dev toggles. Changing this is a "point at the
   * other build" decision that you then reload against repeatedly, so losing it
   * on every refresh would make it useless — and worse, you would be reading
   * results from a host you thought you had switched away from.
   *
   * Deliberately does NOT touch auth: the fqdn and appId come from the tenant
   * and are unchanged, so the session stays valid. Only the origin serving the
   * bundle differs.
   */
  const [componentHostKey, setComponentHostKeyState] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(COMPONENT_HOST_KEY);
      return stored && stored in (getViewerConfig().componentHosts ?? {}) ? stored : null;
    } catch {
      return null; // private mode / storage disabled
    }
  });

  const setComponentHostKey = useCallback((key: string | null) => {
    setComponentHostKeyState(key);
    try {
      if (key) localStorage.setItem(COMPONENT_HOST_KEY, key);
      else localStorage.removeItem(COMPONENT_HOST_KEY);
    } catch {
      // Non-fatal: the choice still applies for this session.
    }
  }, []);

  const [bootMode, setBootMode] = useState<BootMode>("access-token");
  const [suppressReferrer, setSuppressReferrer] = useState(false);
  const [explicitLang, setExplicitLang] = useState<string | null>(null);
  const [explicitTheme, setExplicitTheme] = useState<Theme | null>(null);
  const [mapQueryParams, setMapQueryParams] = useState<MapQueryParams>({});
  const [pendingMapCommand, setPendingMapCommandState] =
    useState<PendingMapCommand | null>(null);

  const setPendingMapCommand = useCallback((command: PendingMapCommand | null) => {
    setPendingMapCommandState(command);
  }, []);
  const clearPendingMapCommand = useCallback(() => {
    setPendingMapCommandState(null);
  }, []);
  const [mapIframeHandle, setMapIframeHandle] =
    useState<BridgedIframeHandle | null>(null);
  const [currentIframeUrl, setCurrentIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    setExplicitLang(lang);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setExplicitTheme(t);
  }, []);

  const appendUrlParams = useCallback(
    (base: string, extra?: Record<string, string | undefined>): string => {
      const params = new URLSearchParams();
      // fqdn selects which per-publisher config the component fetches at
      // runtime, so it is appended automatically for every component URL —
      // the same way lang and theme already are.
      const fqdn = TENANTS[tenant]?.fqdn;
      if (fqdn) params.set("fqdn", fqdn);
      if (explicitLang) params.set("lang", explicitLang);
      if (explicitTheme) params.set("theme", explicitTheme);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v != null) params.set(k, v);
        }
      }
      const qs = params.toString();
      if (!qs) return base;
      return base.includes("?") ? `${base}&${qs}` : `${base}?${qs}`;
    },
    [explicitLang, explicitTheme, tenant],
  );

  const value: AppContextType = {
    language,
    setLanguage,
    theme,
    setTheme,
    tenant,
    setTenant,
    bootMode,
    setBootMode,
    suppressReferrer,
    setSuppressReferrer,
    componentHosts,
    componentHostKey,
    setComponentHostKey,
    // Override wins when set; otherwise the tenant's own host. Resolved here
    // rather than at each call site so every page and nested iframe follows.
    smartComponentsHost:
      (componentHostKey && componentHosts[componentHostKey]) ||
      TENANTS[tenant].smartComponentsHost,
    legacyComponentsHost: TENANTS[tenant].legacyComponentsHost,
    explicitLang,
    explicitTheme,
    mapComponentConfig: MAP_THEMES[theme],
    mapQueryParams,
    setMapQueryParams,
    pendingMapCommand,
    setPendingMapCommand,
    clearPendingMapCommand,
    mapIframeHandle,
    setMapIframeHandle,
    currentIframeUrl,
    setCurrentIframeUrl,
    appendUrlParams,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
