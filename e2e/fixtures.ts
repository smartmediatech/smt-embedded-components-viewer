import fs from "node:fs";
import { test as base, expect, type Frame, type Page } from "@playwright/test";
import { mockBackend, mockSession, type MockBackendOptions } from "./backend/mockBackend";
import { DATA_MODE } from "./dataMode";
import { currentTenant, TENANT_KEY } from "./tenants";

/** The component tabs the suite covers. The map is out of scope. */
export const COMPONENT_PAGES = ["discover", "rewards", "challenges", "giveaways"] as const;
export type ComponentPage = (typeof COMPONENT_PAGES)[number];

/** An element that only exists once the component has loaded its data. */
const READY: Record<ComponentPage, string> = {
  discover: "button.challenge-card",
  rewards: "button.feed-card",
  challenges: "button.feed-card",
  // `giveaways.card` in the publisher config: "catalogue" renders the shared
  // feed card, "classic" its own giveaway card.
  giveaways: "button.feed-card, button.giveaway-card",
};

type StorageState = {
  cookies: never[];
  origins: { origin: string; localStorage: { name: string; value: string }[] }[];
};

let configBody: Promise<string> | undefined;
let backendOptions: Promise<Omit<MockBackendOptions, "liveOrigins"> & { componentsOrigin: string }> | undefined;
let warned = false;

/** The viewer config.json for the tenant, fetched once per worker. */
function loadConfig(): Promise<string> {
  configBody ??= (async () => {
    const { configUrl } = currentTenant();
    if (!/^https?:\/\//.test(configUrl)) return fs.readFileSync(configUrl, "utf8");
    const response = await fetch(configUrl);
    if (!response.ok) throw new Error(`GET ${configUrl}: ${response.status}`);
    return response.text();
  })();
  return configBody;
}

/**
 * What mocked mode needs to know about the tenant: its fqdn and appId (from the
 * viewer config), and its points coin (from the live tenant config, which the
 * components fetch from their own host).
 */
function loadBackendOptions() {
  backendOptions ??= (async () => {
    const viewer = JSON.parse(await loadConfig());
    const tenant = viewer.tenants[viewer.defaultTenant];
    const componentsOrigin = new URL(tenant.smartComponentsHost).origin;
    const tenantConfigUrl = `${componentsOrigin}/config/${tenant.fqdn}.json`;
    const response = await fetch(tenantConfigUrl);
    if (!response.ok) throw new Error(`GET ${tenantConfigUrl}: ${response.status}`);
    const tenantConfig = await response.json();
    return {
      fqdn: tenant.fqdn as string,
      appId: tenant.appId as string,
      coin: (tenantConfig.marketplace?.coin as string) ?? "Points",
      componentsOrigin,
    };
  })();
  return backendOptions;
}

function jwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * The saved login, moved to the local viewer's origin.
 *
 * The viewer keeps its session in localStorage (`refresh_token`, `auth_user`),
 * which is per origin, so a login saved on the hosted demo has to be copied to
 * the origin the suite serves the viewer from. Returns a reason to skip when
 * there is no usable login.
 */
function loadSession(origin: string): StorageState | string {
  const { storageState } = currentTenant();
  const hint = "Save one with `yarn test:e2e:login` (see e2e/README.md) or set E2E_STORAGE_STATE.";
  if (!fs.existsSync(storageState)) {
    return `No saved login for tenant "${TENANT_KEY}" at ${storageState}. ${hint}`;
  }
  const saved = JSON.parse(fs.readFileSync(storageState, "utf8")) as StorageState;
  const entries = saved.origins.find((o) =>
    o.localStorage.some((item) => item.name === "refresh_token"),
  )?.localStorage;
  const refresh = entries?.find((item) => item.name === "refresh_token")?.value;
  if (!entries || !refresh) return `${storageState} holds no viewer session. ${hint}`;
  const expiry = jwtExpiry(refresh);
  // The viewer itself treats a session with under 5 minutes left as signed out.
  if (expiry !== null && expiry < Date.now() + 10 * 60 * 1000) {
    return `The saved login at ${storageState} expired (${new Date(expiry).toISOString()}). ${hint}`;
  }
  // Leave out the dev menu's component host override (AppContext restores it
  // and it wins over the tenant's host): the suite must test the tenant's build.
  const session = entries.filter((item) => item.name !== "smt-viewer:componentHost");
  return { cookies: [], origins: [{ origin, localStorage: session }] };
}

export const test = base.extend({
  storageState: async ({ baseURL }, use, testInfo) => {
    const origin = new URL(baseURL!).origin;
    if (DATA_MODE === "mocked") {
      const options = await loadBackendOptions();
      await use({ cookies: [], origins: [{ origin, localStorage: mockSession({ ...options, liveOrigins: [] }) }] });
      return;
    }
    const session = loadSession(origin);
    if (typeof session === "string") {
      // The list reporter does not print skip reasons: say it once per worker.
      if (!warned) console.warn(`[e2e] skipping: ${session}`);
      warned = true;
      testInfo.skip(true, session);
    }
    await use(session as StorageState);
  },
  context: async ({ context, baseURL }, use) => {
    const body = await loadConfig();
    await context.route(/\/config\.json(\?.*)?$/, (route) =>
      route.fulfill({ body, contentType: "application/json" }),
    );
    if (DATA_MODE === "live") {
      await use(context);
      return;
    }
    const { componentsOrigin, ...options } = await loadBackendOptions();
    const backend = await mockBackend(context, {
      ...options,
      liveOrigins: [new URL(baseURL!).origin, componentsOrigin],
    });
    await use(context);
    expect(
      [...new Set(backend.unmocked)],
      "Requests with no mock in e2e/backend (add one, or the data now depends on the sandbox)",
    ).toEqual([]);
  },
});

export { expect };

/** The component's own iframe (not a modal's), once it has rendered its data. */
export async function openComponent(page: Page, name: ComponentPage): Promise<Frame> {
  await page.goto(`#/${name}`);
  await expect(page, "the saved login was rejected").not.toHaveURL(/#\/login/);
  const frame = await componentFrame(page, `/components/${name}/`);
  await frame.locator(READY[name]).first().waitFor({ timeout: 45_000 });
  return frame;
}

/** Waits for a frame whose URL contains `fragment`. */
export async function componentFrame(page: Page, fragment: string): Promise<Frame> {
  let found: Frame | undefined;
  await expect
    .poll(() => (found = page.frames().find((f) => f.url().includes(fragment))), {
      message: `no frame loaded from ${fragment}`,
      timeout: 45_000,
    })
    .toBeTruthy();
  return found!;
}

export function readySelector(name: ComponentPage): string {
  return READY[name];
}
