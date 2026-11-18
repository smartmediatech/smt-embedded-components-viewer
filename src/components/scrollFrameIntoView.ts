/**
 * Host side of `frame.scrollIntoView`: scroll the page so that a band of a
 * host-sized iframe (frame coordinates `top`..`bottom`, usually the focused
 * card) is on screen.
 *
 * The component asks on every focus change. Chrome has usually scrolled the
 * page to it already, maybe smoothly and still moving; Safari never scrolls a
 * page for focus inside a cross-origin frame. So this waits until the page has
 * stopped scrolling, then:
 * - if the browser scrolled the page since focus moved (Chrome), it trusts that
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

/** True while a scroll this module started is running: its events are not the browser's. */
let ownScroll = false;
/** Date.now() of the page's last scroll event that was not ours. */
let lastBrowserScroll = -Infinity;
let tracking = false;

/**
 * Start recording the page's scroll events. Call it before the frame can take
 * focus (when registering the handler): the browser's focus scroll may happen
 * before the first request arrives, and it must not be missed.
 */
export function trackScrolls(): void {
  if (tracking) return;
  tracking = true;
  window.addEventListener(
    "scroll",
    () => {
      if (!ownScroll) lastBrowserScroll = Date.now();
    },
    { passive: true },
  );
}

/** Scroll events this long before the focus time still count as its scroll. */
const SLACK_MS = 50;

/**
 * Resolves once window.scrollY has not changed for two frames, after at least
 * `minFrames` frames (a smooth scroll may start a frame late), max ~1 s.
 */
function scrollIdle(minFrames = 0): Promise<void> {
  return new Promise((resolve) => {
    let last = window.scrollY;
    let still = 0;
    let frames = 0;
    const tick = () => {
      frames++;
      still = window.scrollY === last ? still + 1 : 0;
      last = window.scrollY;
      if ((frames >= minFrames && still >= 2) || frames > 60) resolve();
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

/**
 * @param focusedAt Date.now() in the frame when focus moved. Only scrolls from
 *   then on count as the browser's focus scroll, so a user's own scrolling just
 *   before Tab doesn't. Without it, any scroll in the last half second counts.
 */
export async function scrollFrameIntoView(
  iframe: HTMLIFrameElement,
  top: number,
  bottom: number,
  focusedAt?: number,
): Promise<void> {
  trackScrolls();
  const since = (focusedAt ?? Date.now() - 500) - SLACK_MS;
  await scrollIdle();
  // The frame may have gone while we waited; its coordinates mean nothing now.
  if (!iframe.isConnected) return;
  const frame = iframe.getBoundingClientRect();
  const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const bandTop = frame.top + top;
  const bandBottom = frame.top + bottom;
  if (lastBrowserScroll >= since) {
    // The browser scrolled for this focus; leave its result alone unless nothing shows.
    const someVisible = bandBottom > header && bandTop < window.innerHeight;
    if (someVisible) return;
  }
  const delta = scrollDelta(bandTop, bandBottom, header, window.innerHeight);
  if (delta === 0) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  ownScroll = true;
  window.scrollBy({ top: delta, behavior: reduce ? "auto" : "smooth" });
  // Ours until it has actually stopped, not for a fixed time.
  await scrollIdle(4);
  ownScroll = false;
}
