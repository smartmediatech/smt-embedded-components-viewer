/**
 * Where the suite's backend data comes from (E2E_DATA):
 *
 *   mocked — fixtures in e2e/backend (default; the only mode CI runs)
 *   live   — the tenant's sandbox, signed in as a saved user
 *
 * The components and the tenant config load live in both. See
 * docs/adr/0001-mock-backend-data-keep-components-live.md.
 */
export type DataMode = "mocked" | "live";

function dataMode(): DataMode {
  const value = process.env.E2E_DATA ?? "mocked";
  if (value !== "mocked" && value !== "live") {
    throw new Error(`Unknown E2E_DATA "${value}". Use "mocked" or "live".`);
  }
  return value;
}

export const DATA_MODE: DataMode = dataMode();
