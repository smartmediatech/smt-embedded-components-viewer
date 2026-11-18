/**
 * Host side of `frame.scrollIntoView`: scroll the page so that a band of a
 * host-sized iframe (frame coordinates `top`..`bottom`, usually the focused
 * card) is on screen.
 *
 * The component asks whenever focus lands on something that isn't fully on
 * screen. Chrome has usually scrolled the page to it already, maybe smoothly
 * and still moving; Safari never scrolls a page for focus inside a cross-origin
 * frame. So this waits until the page has stopped scrolling, then:
 * - if the browser scrolled the page itself just now (Chrome), it trusts that
 *   scroll and acts only if the band is still entirely out of view. Correcting
 *   a few pixels after it (say, a card's top edge under a sticky header) shows
 *   as a second, tiny scroll;
 * - otherwise (Safari) it scrolls the band to the middle of the visible area.
 *
 * Self-contained on purpose: any host that sizes our frames (Palermo's site
 * included) can copy it next to its `frame.resize` handler.
 */

/** Room left between the band and the viewport edge. */
const MARGIN = 16;
/** Off-by-a-few-pixels results of the browser's own scroll count as in view. */
const TOLERANCE = 4;

/** Scrolls this module started end before this time; they are not the browser's. */
let ownScrollUntil = 0;
/** When the page last scrolled other than by us. */
let lastBrowserScroll = -Infinity;
let listening = false;
function trackScrolls() {
  if (listening) return;
  listening = true;
  window.addEventListener(
    "scroll",
    () => {
      if (performance.now() > ownScrollUntil) lastBrowserScroll = performance.now();
    },
    { passive: true },
  );
}
/** The browser's focus scroll lands within a frame or two of the request. */
const RECENT_MS = 500;

/** Resolves once window.scrollY has not changed for two frames (max ~1 s). */
function scrollIdle(): Promise<void> {
  return new Promise((resolve) => {
    let last = window.scrollY;
    let still = 0;
    let frames = 0;
    const tick = () => {
      const now = window.scrollY;
      still = now === last ? still + 1 : 0;
      last = now;
      if (still >= 2 || ++frames > 60) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * How far to scroll so the band [top, bottom] (viewport coordinates) lies in
 * the visible area [start, end], or 0 when it already does. `start` is below
 * any sticky header (the page's scroll-padding-top).
 *
 * A band that fits is centred in the area, as Chrome centres an element it
 * scrolls to for focus, so both browsers land in the same place. A band taller
 * than the area counts as in view when its top is, and is otherwise aligned
 * to the top of the area.
 */
export function scrollDelta(top: number, bottom: number, start: number, end: number): number {
  const fits = bottom - top <= end - start - 2 * MARGIN;
  if (top >= start - TOLERANCE && (bottom <= end + TOLERANCE || (!fits && top < end))) return 0;
  if (!fits) return top - start - MARGIN;
  return (top + bottom) / 2 - (start + end) / 2;
}

export async function scrollFrameIntoView(iframe: HTMLIFrameElement, top: number, bottom: number): Promise<void> {
  trackScrolls();
  const asked = performance.now();
  await scrollIdle();
  const frame = iframe.getBoundingClientRect();
  const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const bandTop = frame.top + top;
  const bandBottom = frame.top + bottom;
  if (lastBrowserScroll > asked - RECENT_MS) {
    // The browser handled it; leave its result alone unless nothing shows.
    const someVisible = bandBottom > header && bandTop < window.innerHeight;
    if (someVisible) return;
  }
  const delta = scrollDelta(bandTop, bandBottom, header, window.innerHeight);
  if (delta === 0) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Long enough for a smooth scroll to finish; its scroll events aren't the browser's.
  ownScrollUntil = performance.now() + 1000;
  window.scrollBy({ top: delta, behavior: reduce ? "auto" : "smooth" });
}
