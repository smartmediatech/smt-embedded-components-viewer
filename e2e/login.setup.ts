import fs from "node:fs";
import path from "node:path";
import { test as base, expect } from "@playwright/test";
import { currentTenant, TENANT_KEY } from "./tenants";

/**
 * Signs in to the local viewer and saves the session for the a11y suite.
 *
 *   E2E_EMAIL=… yarn test:e2e:login
 *
 * Sign-in is by emailed code, so this opens a browser window: the test asks
 * for the code, you type it there (or use Google or SMT instead).
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
    console.log("Sign in in the browser window.");
  }
  await expect(page).not.toHaveURL(/#\/login/, { timeout: MANUAL_SIGN_IN_TIMEOUT });

  fs.mkdirSync(path.dirname(storageState), { recursive: true });
  await context.storageState({ path: storageState });
  fs.chmodSync(storageState, 0o600);
  console.log(`Saved the ${TENANT_KEY} session to ${storageState}`);
  await context.close();
});
