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
  /**
   * Matched against each violating node's axe target selector and HTML
   * snippet, so a new violation of the same rule on another element still
   * fails the suite.
   */
  node: RegExp;
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
    node: /\btext-card-eyebrow\b/,
    pages: ["rewards", "challenges"],
    scope: "component",
    reason: "Card eyebrow text (tier / category label, .text-card-eyebrow) in the tenant accent colour on the card background.",
    task: TASKS.wcag6b,
  },
  {
    rule: "color-contrast",
    node: /\.bg-badge-background\b/,
    pages: ["challenges"],
    scope: "component",
    reason: 'The time-left badge ("5 days left") on an inactive challenge card: the card is at 50% opacity, so the badge text falls below 4.5:1.',
    task: TASKS.wcag6b,
  },
  {
    rule: "role-img-alt",
    node: /aria-describedby="card-default_aria_desc"/,
    pages: ["discover", "giveaways", "challenges"],
    scope: "modal",
    reason: 'The engaged card\'s face (nested cdn.smartmedialabs.io iframe) renders div[role=img] with aria-describedby="card-default_aria_desc" but no accessible name. This comes from the face content on the Lab CDN, not from smt-embedded-components source.',
    task: TASKS.wcag6,
  },
];

export const KNOWN_CHECK_FINDINGS: readonly KnownCheckFinding[] = [
  {
    check: "modal-escape-from-iframe",
    pages: "all",
    reason: "Escape only closes the modal from the host document; with focus inside the modal's iframe the keydown never reaches the host, and the bridge has no request a component sends to close it (needs one in smart-sdk and the components).",
    task: TASKS.wcag5,
  },
  {
    check: "modal-focus-not-returned",
    pages: "all",
    reason: "Closing the modal returns focus to the list iframe, not to the card in it: Chromium drops the card's focus inside that iframe when focus moves to the modal's iframe. Putting it back on the card needs a bridge message (e.g. focus.restore) in smart-sdk and the components.",
    task: TASKS.wcag5,
  },
];

export function pageMatches(pages: KnownAxeFinding["pages"], page: ComponentPage): boolean {
  return pages === "all" || pages.includes(page);
}
