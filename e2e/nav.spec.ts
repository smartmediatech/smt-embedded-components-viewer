import { test, expect } from "./fixtures";

/**
 * The component nav: its order and labels. "Earn" is the product's name for
 * challenges; the route and the component keep "challenges".
 */
test("nav lists Discover, Earn, Rewards, Giveaways, Map", async ({ page }) => {
  await page.goto("#/discover");
  await expect(page.getByRole("tab")).toHaveText(["Discover", "Earn", "Rewards", "Giveaways", "Map"]);
});

test("Earn opens the challenges component and shows as the active tab", async ({ page }) => {
  await page.goto("#/discover");
  await page.getByRole("tab", { name: "Earn" }).click();
  await expect(page).toHaveURL(/#\/challenges$/);
  await expect(page.getByRole("tab", { name: "Earn" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Earn settings" })).toBeVisible();
});
