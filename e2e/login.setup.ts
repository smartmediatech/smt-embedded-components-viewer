import fs from "node:fs";
import path from "node:path";
import { test as base, expect } from "@playwright/test";
import { currentTenant, TENANT_KEY } from "./tenants";

/**
 * Signs in to the local viewer and saves the session for the a11y suite.
 *
 *   E2E_EMAIL=… E2E_PASSWORD=… yarn test:e2e:login
 *
 * The file lands outside the repo (E2E_STORAGE_STATE, or the tenant's default
 * in tenants.ts) and is readable by you only.
 */
base("save a signed-in session", async ({ browser, baseURL }) => {
  const { E2E_EMAIL: email, E2E_PASSWORD: password } = process.env;
  base.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to save a login.");

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
  await page.fill("input[name=email]", email!);
  await page.fill("input[name=password]", password!);
  await page.click("button[type=submit]");
  await expect(page).not.toHaveURL(/#\/login/, { timeout: 30_000 });

  fs.mkdirSync(path.dirname(storageState), { recursive: true });
  await context.storageState({ path: storageState });
  fs.chmodSync(storageState, 0o600);
  console.log(`Saved the ${TENANT_KEY} session to ${storageState}`);
  await context.close();
});
