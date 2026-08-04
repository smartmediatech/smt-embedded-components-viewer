/**
 * Runtime configuration for the example viewer.
 *
 * Nothing customer-specific lives in this repo's source. Demo tenants, the
 * auth backend, the OneTrust domain id and the map theme all come from
 * `public/config.json`, which is gitignored and injected at deploy time.
 * `public/config.example.json` is committed so a fresh clone runs immediately
 * against the SMT demo defaults.
 */

export type MapThemeColors = {
  accent?: string;
  locationButtonBackground?: string;
  locationButtonForeground?: string;
  pickupRadiusFill?: string;
};

/**
 * Declared as a type alias, not an interface: it is passed to BridgedIframe's
 * `componentConfig: Record<string, unknown>` prop, and only type aliases get
 * TypeScript's implicit index signature.
 */
export type MapComponentConfig = {
  theme?: {
    mode?: "light" | "dark";
    colors?: MapThemeColors;
  };
};

/**
 * One demo target = one customer in one environment.
 *
 * The hostname determines the environment (each CloudFront distribution is
 * bound to exactly one env), and `fqdn` selects the publisher config the
 * components fetch at runtime. Together they fully specify a target, which is
 * why no environment appears anywhere in these URLs.
 */
export interface ViewerTenant {
  label: string;
  /** Passed to components as `?fqdn=` — selects which config they load. */
  fqdn?: string;
  /**
   * App id used to log in against this tenant.
   *
   * MUST match `identity.appId` in the publisher config the components load for
   * this tenant's `fqdn`. The viewer authenticates and hands the token to the
   * component over the bridge; if the two ids disagree the platform rejects the
   * token, which surfaces as component failures rather than a login error.
   *
   * Falls back to the global `auth.appId` when omitted.
   */
  appId?: string;
  smartComponentsHost: string;
  legacyComponentsHost: string;
  disabled?: boolean;
}

export interface ViewerConfig {
  defaultTenant: string;
  tenants: Record<string, ViewerTenant>;
  /**
   * Optional dev override: serve the components from somewhere other than the
   * active tenant's own `smartComponentsHost`.
   *
   * This exists because "which publisher" and "which host serves the bundle"
   * are independent questions that the tenant entry conflates. Switching
   * publisher changes the appId and forces a re-login; switching only the host
   * keeps the same fqdn and appId, so it needs neither — you are pointing the
   * same tenant at a different copy of the same bundle.
   *
   * Keys are labels shown in the picker; values are component host roots.
   * Absent, or a key that is not present, means "use the tenant's own host".
   */
  componentHosts?: Record<string, string>;
  auth: {
    apiBaseUrl: string;
    appId: string;
  };
  oneTrust?: {
    domainScriptId: string;
    /** Consent group that gates tracking (OneTrust's own group id). */
    consentGroup: string;
  };
  mapTheme: {
    light: MapComponentConfig;
    dark: MapComponentConfig;
  };
}

let current: ViewerConfig | null = null;
let activeTenant: string | null = null;

export function getViewerConfig(): ViewerConfig {
  if (!current) {
    throw new Error(
      "Viewer config not loaded. loadViewerConfig() must resolve before the app renders.",
    );
  }
  return current;
}

/**
 * Mirrors the selected tenant outside React.
 *
 * The auth service is a plain module, not a hook, but the app id it must send
 * depends on which tenant is selected — so AppContext pushes the selection here
 * whenever it changes.
 */
export function setActiveTenant(key: string): void {
  activeTenant = key;
}

/**
 * App id for the selected tenant, falling back to the global one.
 *
 * This is what the login request is signed with, and it has to agree with the
 * `identity.appId` of the config the components load for the same tenant.
 */
export function getActiveAppId(): string {
  const config = getViewerConfig();
  const tenant = activeTenant ? config.tenants[activeTenant] : undefined;
  return tenant?.appId ?? config.auth.appId;
}

async function fetchConfig(url: string): Promise<ViewerConfig | null> {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return null;
    return (await response.json()) as ViewerConfig;
  } catch {
    return null;
  }
}

/**
 * Loads `config.json`, falling back to the committed example so that cloning
 * the repo and running `yarn dev` works with no setup. A deployment always
 * injects a real `config.json` into `dist/` before upload.
 */
export async function loadViewerConfig(): Promise<ViewerConfig> {
  const config =
    (await fetchConfig("config.json")) ?? (await fetchConfig("config.example.json"));

  if (!config) {
    throw new Error(
      "Neither config.json nor config.example.json could be loaded — the viewer cannot start.",
    );
  }

  if (!config.tenants || Object.keys(config.tenants).length === 0) {
    throw new Error("Viewer config contains no tenants.");
  }
  // Without this the app seeds its tenant state with an unknown key and every
  // TENANTS[tenant] lookup returns undefined — a blank page with no clue why.
  if (!config.defaultTenant || !(config.defaultTenant in config.tenants)) {
    throw new Error(
      `Viewer config defaultTenant "${config.defaultTenant}" is not one of: ` +
        Object.keys(config.tenants).join(", "),
    );
  }

  current = config;
  // Seed the active tenant here, before any component renders or any effect
  // runs, so the app id is correct even for a session restore that happens
  // during the very first mount. Relying on a provider to seed it would make
  // correctness depend on provider nesting order.
  activeTenant = config.defaultTenant;
  injectOneTrust(config);
  return config;
}

/**
 * OneTrust is injected here rather than hardcoded in index.html so the domain
 * id stays configuration. Absent config simply means no consent banner.
 */
function injectOneTrust(config: ViewerConfig): void {
  const domainScriptId = config.oneTrust?.domainScriptId;
  if (!domainScriptId) return;

  const script = document.createElement("script");
  script.src = "https://cdn.cookielaw.org/scripttemplates/otSDKStub.js";
  script.type = "text/javascript";
  script.charset = "UTF-8";
  script.setAttribute("data-domain-script", domainScriptId);
  document.head.appendChild(script);
}
