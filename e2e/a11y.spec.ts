import {
  test,
  expect,
  openComponent,
  readySelector,
  COMPONENT_PAGES,
} from "./fixtures";
import {
  expectKnownCheckFindings,
  expectNoNewAxeViolations,
  focusStop,
  MODAL,
  walk,
  type FocusStop,
} from "./a11y";

/**
 * WCAG 2.2 AA checks the components' Storybook cannot make: the viewer's host
 * page, the iframe boundary, and the modals the viewer opens over the bridge.
 * Runs this repo's viewer locally against the tenant's sandbox components.
 */

/** Max Tab presses before a walk counts as stuck. */
const MAX_TABS = 120;

/** Host → component iframe → host: focus got in and back out. */
function crossesComponent(stops: FocusStop[]): boolean {
  const entered = stops.findIndex((s) => s.frame && !s.inModal);
  return entered >= 0 && stops.slice(entered).some((s) => !s.frame);
}

/** Two presses in a row that leave focus on the same element inside a frame. */
function stuckAt(stops: FocusStop[]): string | null {
  for (let i = 1; i < stops.length; i++) {
    const [a, b] = [stops[i - 1], stops[i]];
    if (a.frame && a.frame === b.frame && a.id === b.id && a.tag !== "body") {
      return a.label;
    }
  }
  return null;
}

const trail = (stops: FocusStop[]) =>
  stops.map((s) => `${s.frame ? "[iframe] " : ""}${s.label}`).join(" → ");

for (const name of COMPONENT_PAGES) {
  test.describe(name, () => {
    test("axe: host page and component iframe", async ({ page }, testInfo) => {
      await openComponent(page, name);
      await expectNoNewAxeViolations(page, name, ["host", "component"], testInfo);
    });

    test("keyboard: Tab into, through and out of the iframe, both ways", async ({ page }) => {
      await openComponent(page, name);

      const forward = await walk(page, "Tab", MAX_TABS, crossesComponent);
      expect(stuckAt(forward), `focus stuck in the iframe: ${trail(forward)}`).toBeNull();
      expect(crossesComponent(forward), `Tab did not cross the iframe: ${trail(forward)}`).toBe(true);

      // Shift+Tab from past the iframe, back through it to the header.
      const backward = await walk(page, "Shift+Tab", MAX_TABS, crossesComponent);
      expect(stuckAt(backward), `focus stuck in the iframe: ${trail(backward)}`).toBeNull();
      expect(crossesComponent(backward), `Shift+Tab did not cross the iframe: ${trail(backward)}`).toBe(true);
    });

    test("2.4.11: focus in the iframe is not hidden by a sticky header", async ({ page }) => {
      await openComponent(page, name);
      // The demo header scrolls away; a publisher's site usually sticks it.
      await page.addStyleTag({ content: "header { position: sticky !important; top: 0 !important; }" });
      const header = (await page.locator("header").first().boundingBox())!;
      const headerBottom = header.y + header.height;
      const viewportHeight = page.viewportSize()!.height;

      const hidden = new Set<string>();
      for (const key of ["Tab", "Shift+Tab"] as const) {
        const stops = await walk(page, key, MAX_TABS, crossesComponent);
        for (const stop of stops) {
          // Everything of it that is on screen is behind the header: that is
          // what 2.4.11 (AA) forbids.
          if (!stop.frame || !stop.rect) continue;
          const top = Math.max(stop.rect.top, 0);
          const bottom = Math.min(stop.rect.bottom, viewportHeight);
          if (bottom > top && top >= header.y && bottom <= headerBottom) {
            hidden.add(`${key}: ${stop.label}`);
          }
        }
      }
      expectKnownCheckFindings(name, ["focus-hidden-by-sticky-header"], new Set(hidden.size ? ["focus-hidden-by-sticky-header"] : []), {
        "focus-hidden-by-sticky-header": [...hidden].join("; "),
      });
    });

    for (const viewport of [
      { width: 320, height: 640, why: "1.4.10 reflow at 320 CSS px" },
      { width: 640, height: 400, why: "1.4.4 / 1.4.10 at 200% zoom of 1280x800" },
    ]) {
      test(`reflow: no horizontal scroll at ${viewport.width} px (${viewport.why})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const frame = await openComponent(page, name);
        const overflow = (el: Element) => el.scrollWidth - el.clientWidth;
        const host = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const component = await frame.locator("html").evaluate(overflow);

        const observed = new Set<string>();
        if (host > 1) observed.add(`reflow-host-${viewport.width}`);
        if (component > 1) observed.add(`reflow-component-${viewport.width}`);
        expectKnownCheckFindings(
          name,
          [`reflow-host-${viewport.width}`, `reflow-component-${viewport.width}`],
          observed,
          {
            [`reflow-host-${viewport.width}`]: `host page is ${host}px wider than the viewport`,
            [`reflow-component-${viewport.width}`]: `component document is ${component}px wider than its iframe`,
          },
        );
      });
    }

    test("modal: open from a card by keyboard, axe, focus, Escape, close", async ({ page }, testInfo) => {
      const list = await openComponent(page, name);
      const trigger = list.locator(readySelector(name)).first();
      const modal = page.locator(MODAL);

      const open = async () => {
        await trigger.focus();
        await page.keyboard.press("Enter");
        await expect(modal, "no modal after Enter on the first card").toBeVisible({ timeout: 20_000 });
        const modalFrame = await modal.locator("iframe").first().elementHandle();
        const content = (await modalFrame!.contentFrame())!;
        await content.locator("body *").first().waitFor({ timeout: 30_000 });
        // Card faces load in a nested iframe after the component renders.
        // Capped: some modals (games) never let the network go idle.
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      };
      const observed = new Set<string>();

      await open();
      // One element must carry all three: the dialog role, modality and a name.
      const dialog = await modal.evaluate((el) => {
        const d = el.matches("[role=dialog], dialog") ? el : el.querySelector("[role=dialog], dialog");
        if (!d) return false;
        const modal = d.getAttribute("aria-modal") === "true" || (d.tagName === "DIALOG" && d.matches(":modal"));
        const labelledBy = (d.getAttribute("aria-labelledby") ?? "")
          .split(/\s+/)
          .map((id) => (id ? document.getElementById(id)?.textContent ?? "" : ""))
          .join(" ");
        const named = !!(d.getAttribute("aria-label")?.trim() || labelledBy.trim());
        return modal && named;
      });
      if (!dialog) observed.add("modal-no-dialog-role");
      if (!(await focusStop(page)).inModal) observed.add("modal-focus-not-moved");

      await expectNoNewAxeViolations(page, name, ["host", "component", "modal"], testInfo, ["modal"]);

      // Focus containment: from the close button, Tab and Shift+Tab must stay
      // in the modal, iframe included. Focus on the host body means the browser
      // UI, which is fine (headless Chromium goes there instead of wrapping).
      const escaped = (stops: FocusStop[]) => stops.some((s) => !s.inModal && s.tag !== "body");
      const tabs: FocusStop[] = [];
      for (const key of ["Tab", "Shift+Tab"] as const) {
        await modal.getByRole("button", { name: "Close", exact: true }).focus();
        tabs.push(...(await walk(page, key, 25, escaped)));
      }
      if (escaped(tabs)) observed.add("modal-focus-not-contained");

      // Close with the close button, by keyboard: focus goes back to the card.
      await modal.getByRole("button", { name: "Close", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(modal).toBeHidden();
      const after = await focusStop(page);
      const backOnTrigger = after.frame === list && (await trigger.evaluate((el) => el === document.activeElement));
      if (!backOnTrigger) {
        observed.add("modal-focus-not-returned");
      }

      // Escape with focus inside the modal's iframe.
      await open();
      await modal.locator("iframe").first().focus();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      if (await modal.isVisible()) observed.add("modal-escape-from-iframe");

      expectKnownCheckFindings(
        name,
        [
          "modal-no-dialog-role",
          "modal-focus-not-moved",
          "modal-focus-not-contained",
          "modal-focus-not-returned",
          "modal-escape-from-iframe",
        ],
        observed,
        {
          "modal-focus-not-contained": trail(tabs),
          "modal-focus-not-returned": `focus is on ${after.frame ? "[iframe] " : ""}${after.label}`,
        },
      );
    });

    // The close button sits above the dialog box; in a short window it must
    // still be on screen (Escape from inside the iframe does not close).
    test("modal: close button stays on screen in a short window (640x400)", async ({ page }) => {
      await page.setViewportSize({ width: 640, height: 400 });
      const list = await openComponent(page, name);
      await list.locator(readySelector(name)).first().focus();
      await page.keyboard.press("Enter");
      const modal = page.locator(MODAL);
      await expect(modal).toBeVisible({ timeout: 20_000 });
      const box = await modal.getByRole("button", { name: "Close", exact: true }).boundingBox();
      expect(box, "close button has no layout box").not.toBeNull();
      expect(box!.y, "close button is above the top of the window").toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(400);
    });
  });
}
