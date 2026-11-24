import { test, expect } from "./fixtures";

/**
 * The component nav: its order and labels, on the desktop sidebar and on the
 * mobile tab bar. Both are built from COMPONENT_TABS, which lists only the
 * pages of the Eagles Ticket Club design: Discover, Collection, Marketplace.
 * Only one of the two is shown at a time, and getByRole skips the hidden one.
 */
const SECTIONS = ["Discover", "Collection", "Marketplace"];

for (const layout of [
  { name: "sidebar", viewport: { width: 1280, height: 800 } },
  { name: "mobile tab bar", viewport: { width: 390, height: 844 } },
]) {
  test.describe(layout.name, () => {
    test.use({ viewport: layout.viewport });

    test(`lists ${SECTIONS.join(", ")}`, async ({ page }) => {
      await page.goto("#/discover");
      await expect(page.getByRole("navigation").getByRole("button")).toHaveText(SECTIONS);
    });

    test("Marketplace opens its page and shows as the current one", async ({ page }) => {
      await page.goto("#/discover");
      const nav = page.getByRole("navigation");
      await expect(nav.getByRole("button", { name: "Discover" })).toHaveAttribute("aria-current", "page");

      await nav.getByRole("button", { name: "Marketplace" }).click();
      await expect(page).toHaveURL(/#\/marketplace$/);
      await expect(nav.getByRole("button", { name: "Marketplace" })).toHaveAttribute("aria-current", "page");
      await expect(nav.getByRole("button", { name: "Discover" })).not.toHaveAttribute("aria-current");
    });
  });
}
