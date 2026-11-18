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
 *   a few pixels after it (say, a card's top edge under a header) shows
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

/**
 * The bottom of the fixed or sticky elements at viewport point (x, y) that
 * start at or above `y`, or `y - 1` when there are none.
 */
function stuckBottom(x: number, y: number): number {
  let bottom = y - 1;
  for (const hit of document.elementsFromPoint(x, y)) {
    for (let el: Element | null = hit; el && el !== document.body; el = el.parentElement) {
      const { position } = getComputedStyle(el);
      if (position !== "fixed" && position !== "sticky") continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= y) bottom = Math.max(bottom, rect.bottom);
      break;
    }
  }
  return bottom;
}

/**
 * How much of the top of the viewport is covered above column `x`: the bottom
 * of the fixed or sticky elements stuck there (a header, or a top bar with a
 * sticky menu under it), else 0. Each one found, it looks again just below it,
 * so stacked bars add up.
 * Measured, not read from scroll-padding-top: a page may set that for a header
 * that only sticks sometimes, or not at all, and nothing covers the top then.
 */
function coveredTop(x: number): number {
  let covered = 0;
  // A few bars at most; the cap only guards against a pathological page.
  for (let i = 0; i < 8 && covered < window.innerHeight - 1; i++) {
    const bottom = stuckBottom(x, Math.max(covered, 0) + 1);
    if (bottom <= covered) break;
    covered = bottom;
  }
  return covered;
}

/** Increments per request; a request that is no longer the latest is stale. */
let latestRequest = 0;

/** Scroll events this long before the focus time still count as its scroll. */
const SLACK_MS = 50;

/**
 * Resolves once window.scrollY has not changed for two frames, after at least
 * `minFrames` frames (a smooth scroll may start a frame late), or after 1 s
 * at most. The cap is time, not frames: at 240 Hz, 60 frames is a quarter of a
 * second, shorter than a smooth scroll.
 */
function scrollIdle(minFrames = 0): Promise<void> {
  return new Promise((resolve) => {
    let last = window.scrollY;
    let still = 0;
    let frames = 0;
    const deadline = performance.now() + 1000;
    const tick = () => {
      frames++;
      still = window.scrollY === last ? still + 1 : 0;
      last = window.scrollY;
      if ((frames >= minFrames && still >= 2) || performance.now() > deadline) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * How far to scroll so the band [top, bottom] (viewport coordinates) lies in
 * the visible area [start, end], or 0 when it already does. `start` is below
 * whatever covers the top of the viewport (see coveredTop).
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
  const request = ++latestRequest;
  await scrollIdle();
  // While we waited, focus may have moved on (a newer request speaks for it),
  // left the frame, or the frame may have gone: this band means nothing now.
  if (request !== latestRequest || !iframe.isConnected || document.activeElement !== iframe) return;
  const frame = iframe.getBoundingClientRect();
  const header = coveredTop(Math.min(Math.max(frame.left + frame.width / 2, 0), window.innerWidth - 1));
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
