import type { ComponentPage } from "./fixtures";

/**
 * Today's known WCAG 2.2 AA findings. The suite fails on anything not listed
 * here, so a new problem turns it red, and a fixed one (for the checks that
 * are deterministic: keyboard, modal, focus, reflow) does too, until its entry
 * is removed. Same idea as the per-story a11y exceptions in the components'
 * Storybook (WCAG 1).
 *
 * Each entry names the Asana task that owns the fix:
 */
export const TASKS = {
  /** Container and customer snippet: iframe title, focus, resize, modals. */
  wcag5: "https://app.asana.com/0/0/1219990291224925",
  /** Component fixes (Rewards, Reward detail, Challenges, Discover, Giveaways, Card). */
  wcag6: "https://app.asana.com/0/0/1219990342152734",
  /** Colour contrast: palette and tokens per tenant. */
  wcag6b: "https://app.asana.com/0/0/1220140054842172",
} as const;

type Task = (typeof TASKS)[keyof typeof TASKS];

/**
 * Where an axe violation sits: the viewer's own document, the component's
 * iframe, or the iframe of a modal the viewer opened over it (nested frames
 * count as their top-level iframe).
 */
export type AxeScope = "host" | "component" | "modal";

export interface KnownAxeFinding {
  rule: string;
  pages: readonly ComponentPage[] | "all";
  scope: AxeScope;
  reason: string;
  task: Task;
}

export interface KnownCheckFinding {
  /** A check id from checks.ts. */
  check: string;
  pages: readonly ComponentPage[] | "all";
  reason: string;
  task: Task;
}

export const KNOWN_AXE_FINDINGS: readonly KnownAxeFinding[] = [
  {
    rule: "color-contrast",
    pages: ["rewards", "challenges"],
    scope: "component",
    reason: "Card eyebrow text (tier / category label, .text-card-eyebrow) in the tenant accent colour on the card background.",
    task: TASKS.wcag6b,
  },
  {
    rule: "label-content-name-mismatch",
    pages: "all",
    scope: "component",
    reason: 'Card buttons have an aria-label ("Redeem: …", "Start: …", "Open challenge: …", "Enter Giveaway: …") that does not contain the visible text (tier label + title + description). Already fixed in smt-embedded-components#31; goes away when the sandbox bundle is redeployed.',
    task: TASKS.wcag6,
  },
  {
    rule: "role-img-alt",
    pages: ["discover", "giveaways", "challenges"],
    scope: "modal",
    reason: 'The engaged card\'s face (nested cdn.smartmedialabs.io iframe) renders div[role=img] with aria-describedby="card-default_aria_desc" but no accessible name. This comes from the face content on the Lab CDN, not from smt-embedded-components source.',
    task: TASKS.wcag6,
  },
];

export const KNOWN_CHECK_FINDINGS: readonly KnownCheckFinding[] = [
  {
    check: "reflow-host-320",
    pages: "all",
    reason: "At 320 px the viewer header's right-hand actions (language, theme, dev menu, account) overflow by about 10 px: the page scrolls sideways.",
    task: TASKS.wcag5,
  },
  {
    check: "focus-hidden-by-sticky-header",
    pages: ["rewards"],
    reason: "With a sticky host header, Shift+Tab back to the filter chips at the top of the iframe scrolls them under the header (no scroll-padding-top on the host).",
    task: TASKS.wcag5,
  },
  {
    check: "modal-no-dialog-role",
    pages: "all",
    reason: "The modal is a plain fixed div: no role=dialog, aria-modal or accessible name.",
    task: TASKS.wcag5,
  },
  {
    check: "modal-focus-not-moved",
    pages: "all",
    reason: "Opening the modal leaves focus on the card in the list iframe behind it.",
    task: TASKS.wcag5,
  },
  {
    check: "modal-focus-not-contained",
    pages: "all",
    reason: "Tab moves from the modal to the page behind it (header, list iframe); the background is not inert.",
    task: TASKS.wcag5,
  },
  {
    check: "modal-escape-from-iframe",
    pages: "all",
    reason: "Escape only closes the modal from the host document; with focus inside the modal's iframe it does nothing.",
    task: TASKS.wcag5,
  },
  {
    check: "modal-focus-not-returned",
    pages: "all",
    reason: "Closing the modal does not return focus to the card that opened it.",
    task: TASKS.wcag5,
  },
];

export function pageMatches(pages: KnownAxeFinding["pages"], page: ComponentPage): boolean {
  return pages === "all" || pages.includes(page);
}
