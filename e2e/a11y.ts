import AxeBuilder from "@axe-core/playwright";
import type { Frame, Page, TestInfo } from "@playwright/test";
import { DATA_MODE } from "./dataMode";
import { expect, type ComponentPage } from "./fixtures";
import {
  KNOWN_AXE_FINDINGS,
  KNOWN_CHECK_FINDINGS,
  applies,
  type AxeScope,
} from "./known-findings";

/** The same tag set as the components' Storybook a11y gate (WCAG 1). */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** The viewer's modal overlay (see src/components/ComponentModal.tsx). */
export const MODAL = "div.fixed.inset-0";

/**
 * Runs axe on the host page and every iframe in it (cross-origin frames
 * included: @axe-core/playwright injects into each one) and fails on any
 * violating node not in KNOWN_AXE_FINDINGS for this rule, page and scope.
 *
 * Known findings that did not show up are reported as annotations, not
 * failures: what axe sees depends on the sandbox data, which changes.
 */
export async function expectNoNewAxeViolations(
  page: Page,
  name: ComponentPage,
  scopes: readonly AxeScope[],
  testInfo: TestInfo,
  /**
   * Scopes whose known findings must show up in mocked mode. With a modal open
   * the page behind it is covered, so axe cannot judge its contrast: the modal
   * test only vouches for the modal.
   */
  requireSeenIn: readonly AxeScope[] = scopes,
): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const unexpected: string[] = [];
  const seen = new Set<(typeof KNOWN_AXE_FINDINGS)[number]>();

  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      const scope = await scopeOf(page, node.target);
      const known = KNOWN_AXE_FINDINGS.find(
        (f) =>
          f.rule === violation.id &&
          f.scope === scope &&
          applies(f, name) &&
          f.node.test(`${node.target.join(" ")} ${node.html}`),
      );
      if (known) {
        seen.add(known);
      } else {
        unexpected.push(
          `${violation.id} (${violation.impact}) in ${scope}: ${JSON.stringify(node.target)}\n    ${node.html}\n    ${node.failureSummary?.replace(/\n/g, "\n    ")}`,
        );
      }
    }
  }

  for (const finding of KNOWN_AXE_FINDINGS) {
    if (!scopes.includes(finding.scope) || !applies(finding, name)) continue;
    if (seen.has(finding)) continue;
    const description = `${finding.rule} ${finding.node} in ${finding.scope} (${finding.task}): remove it from known-findings.ts if it is fixed`;
    if (DATA_MODE === "mocked" && requireSeenIn.includes(finding.scope)) {
      // Fixed data: a known finding that is gone was fixed.
      expect.soft(false, `Known finding no longer happens on ${name}: ${description}`).toBe(true);
    } else {
      // Live data changes what axe sees: only note it.
      testInfo.annotations.push({ type: "known finding not seen", description });
    }
  }

  expect(unexpected, `New axe violations on ${name}:\n  ${unexpected.join("\n  ")}`).toEqual([]);
}

async function scopeOf(page: Page, target: unknown[]): Promise<AxeScope> {
  if (target.length < 2) return "host";
  const frameSelector = target[0];
  if (typeof frameSelector !== "string") return "component";
  const inModal = await page.evaluate(
    ([selector, modal]) => !!document.querySelector(selector)?.closest(modal),
    [frameSelector, MODAL] as const,
  );
  return inModal ? "modal" : "component";
}

/**
 * Compares the problems a behavioural check observed with KNOWN_CHECK_FINDINGS.
 * These checks are deterministic, so both directions fail: a new problem, and
 * a known one that is gone (remove its entry, the fix landed).
 */
export function expectKnownCheckFindings(
  name: ComponentPage,
  checks: readonly string[],
  observed: ReadonlySet<string>,
  details: Readonly<Record<string, string>> = {},
): void {
  for (const check of checks) {
    const known = KNOWN_CHECK_FINDINGS.find(
      (f) => f.check === check && applies(f, name),
    );
    const detail = details[check] ? `: ${details[check]}` : "";
    if (observed.has(check)) {
      expect.soft(known, `New finding on ${name}: ${check}${detail}`).toBeDefined();
    } else {
      expect
        .soft(known, `${check} no longer happens on ${name}; remove it from known-findings.ts (${known?.task})`)
        .toBeUndefined();
    }
  }
}

/** Where keyboard focus is: the host element, or the element inside an iframe. */
export interface FocusStop {
  /** The iframe the focus is in, or null when it is on the host document. */
  frame: Frame | null;
  /** True when the focused iframe sits inside the viewer's modal. */
  inModal: boolean;
  /** Identifies the focused element within its document; for comparing stops. */
  id: string;
  /** The focused element's tag name, lower case. */
  tag: string;
  /** A readable description of the focused element, for diagnostics only. */
  label: string;
  /** The focused element's box in host viewport coordinates. */
  rect: { top: number; bottom: number; left: number; right: number } | null;
}

/** Self-contained: Playwright ships its source into the page or frame. */
const describe = (el: Element | null) => {
  if (!el) return { id: "none", tag: "none", label: "none", rect: null };
  const r = el.getBoundingClientRect();
  // Tags the element so two stops on different elements with the same text
  // never compare equal.
  const id = el.getAttribute("data-e2e-focus-id") ?? Math.random().toString(36).slice(2);
  el.setAttribute("data-e2e-focus-id", id);
  const tag = el.tagName.toLowerCase();
  const name = el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 40);
  return {
    id,
    tag,
    label: `${tag}${name ? ` "${name}"` : ""}`,
    rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
  };
};

export async function focusStop(page: Page): Promise<FocusStop> {
  const active = await page.evaluateHandle(() => document.activeElement);
  const host = await active.evaluate(describe);
  const inModal = await active.evaluate((el, modal) => !!el?.closest(modal), MODAL);
  const element = active.asElement();
  const frame = element && host.tag === "iframe" ? await element.contentFrame() : null;
  await active.dispose();
  if (!frame || !host.rect) return { frame: null, inModal, ...host };

  const innerActive = await frame.evaluateHandle(() => document.activeElement);
  const inner = await innerActive.evaluate(describe);
  await innerActive.dispose();
  const { top, left } = host.rect;
  return {
    frame,
    inModal,
    id: inner.id,
    tag: inner.tag,
    label: inner.label,
    rect: inner.rect && {
      top: inner.rect.top + top,
      bottom: inner.rect.bottom + top,
      left: inner.rect.left + left,
      right: inner.rect.right + left,
    },
  };
}

/** Presses `key` up to `max` times and records each focus stop. */
export async function walk(
  page: Page,
  key: "Tab" | "Shift+Tab",
  max: number,
  until?: (stops: FocusStop[]) => boolean,
): Promise<FocusStop[]> {
  const stops: FocusStop[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    stops.push(await focusStop(page));
    if (until?.(stops)) break;
  }
  return stops;
}
