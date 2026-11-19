import fs from "node:fs";
import path from "node:path";
import { test as base } from "@playwright/test";
import { currentTenant, TENANT_KEY } from "./tenants";

/**
 * Signs in to the local viewer and saves the session for the a11y suite.
 *
 *   E2E_EMAIL=… yarn test:e2e:login
 *
 * Sign-in is by emailed code, so this opens a browser window: the test asks
 * for the code, you type it there (or use Google instead). Not SMT: that
 * session has no refresh token and lives in sessionStorage, which a saved
 * storage state doesn't keep.
 *
 * The file lands outside the repo (E2E_STORAGE_STATE, or the tenant's default
 * in tenants.ts) and is readable by you only.
 */
const MANUAL_SIGN_IN_TIMEOUT = 5 * 60_000;

base("save a signed-in session", async ({ browser, baseURL }) => {
  base.setTimeout(MANUAL_SIGN_IN_TIMEOUT + 60_000);
  const { E2E_EMAIL: email } = process.env;

  const { configUrl, storageState } = currentTenant();
  const config = /^https?:\/\//.test(configUrl)
    ? await (await fetch(configUrl)).text()
    : fs.readFileSync(configUrl, "utf8");
  const context = await browser.newContext();
  await context.route(/\/config\.json(\?.*)?$/, (route) =>
    route.fulfill({ body: config, contentType: "application/json" }),
  );
  const page = await context.newPage();
  await page.goto(`${baseURL}#/login`);
  if (email) {
    await page.getByRole("button", { name: "Continue with Email" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    console.log(`Type the code sent to ${email} in the browser window.`);
  } else {
    console.log("Sign in with email or Google in the browser window.");
  }
  // Leaving #/login isn't enough: Google and the Sign Up link leave it too.
  // Wait until the viewer is back on its own origin, past the sign-in pages,
  // with a refresh token stored.
  const origin = new URL(baseURL!).origin;
  await page.waitForURL(
    (url) => url.origin === origin && !/^#\/(login|signup)\b/.test(url.hash) && url.hash !== "",
    { timeout: MANUAL_SIGN_IN_TIMEOUT },
  );
  const refresh = await page.evaluate(() => localStorage.getItem("refresh_token"));
  base.skip(!refresh, "Signed in without a refresh token (SMT login?). Use email or Google to save a session.");

  fs.mkdirSync(path.dirname(storageState), { recursive: true });
  await context.storageState({ path: storageState });
  fs.chmodSync(storageState, 0o600);
  console.log(`Saved the ${TENANT_KEY} session to ${storageState}`);
  await context.close();
});
