import os from "node:os";
import path from "node:path";

/**
 * Demo tenants the a11y suite can run against.
 *
 * The suite serves this repo's viewer locally and loads the components from the
 * tenant's sandbox host, so the only per-tenant inputs are the viewer config
 * (fqdn, appId, components host) and a signed-in session for that appId.
 *
 * Pick one with E2E_TENANT. Override the inputs with E2E_VIEWER_CONFIG (a
 * local config.json path or an https URL) and E2E_STORAGE_STATE (a Playwright
 * storageState file).
 */
export interface E2ETenant {
  /** The viewer config.json the hosted demo of this tenant uses. */
  configUrl: string;
  /** Default saved login, outside the repo. */
  storageState: string;
}

const savedLogins = path.join(os.homedir(), ".config", "smt-verify");

export const TENANTS: Record<string, E2ETenant> = {
  palermofcsandbox: {
    configUrl: "https://demo.smartmedialabs.io/embedded-palermofcsandbox/config.json",
    storageState: path.join(savedLogins, "palermo-sandbox-demo.json"),
  },
  smtembed: {
    configUrl: "https://demo.smartmedialabs.io/embedded-smtembed/config.json",
    storageState: path.join(savedLogins, "smtembed-sandbox-demo.json"),
  },
};

export const TENANT_KEY = process.env.E2E_TENANT ?? "palermofcsandbox";

export function currentTenant(): E2ETenant {
  const tenant = TENANTS[TENANT_KEY];
  if (!tenant) {
    throw new Error(
      `Unknown E2E_TENANT "${TENANT_KEY}". Known: ${Object.keys(TENANTS).join(", ")}`,
    );
  }
  return {
    configUrl: process.env.E2E_VIEWER_CONFIG ?? tenant.configUrl,
    storageState: process.env.E2E_STORAGE_STATE ?? tenant.storageState,
  };
}
