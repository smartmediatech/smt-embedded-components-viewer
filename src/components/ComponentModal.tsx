import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@phosphor-icons/react";
import { useA11yLabels } from "../i18n/a11yLabels";

interface ComponentModalProps {
  /** The dialog's accessible name, e.g. the title of the component it shows. */
  label: string;
  onClose: () => void;
  /** The component's BridgedIframe. */
  children: ReactNode;
}

/** A 10:16 box that fits the window, with less margin on small screens. */
function fitDimensions() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const aspectRatio = 10 / 16;
  const isMobile = windowWidth < 768;
  const padding = isMobile ? 10 : 80;
  const maxWidth = windowWidth - padding * 2;
  const maxHeight = windowHeight - padding * 2;

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}

/**
 * The overlay the pages open a card, reward or wearable in. Mount it to open,
 * unmount it to close.
 *
 * It is a modal dialog (WCAG 2.4.3, 4.1.2): role=dialog with a name, the rest
 * of the page inert while it is open, focus moved to the component's iframe on
 * open and back to where it was (the list iframe) on close.
 *
 * Escape closes it while focus is in this document. With focus inside the
 * iframe the keydown never reaches the host, and the bridge has no request a
 * component sends for it.
 */
export const ComponentModal = ({ label, onClose, children }: ComponentModalProps) => {
  const { lang, labels } = useA11yLabels();
  const [dimensions, setDimensions] = useState(fitDimensions);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onResize = () => setDimensions(fitDimensions());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const overlay = dialogRef.current?.parentElement;
    if (!overlay) return;

    // The opener: the list iframe, when the card in it sent navigation.go.
    const opener = document.activeElement as HTMLElement | null;

    dialogRef.current?.querySelector("iframe")?.focus();

    // Everything else on the page goes inert: no focus, no clicks, hidden from
    // assistive tech. Skip what already was (another overlay's doing).
    const inerted = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el !== overlay && el instanceof HTMLElement && !el.inert,
    );
    inerted.forEach((el) => (el.inert = true));

    return () => {
      inerted.forEach((el) => (el.inert = false));
      // Back to the list iframe. Chromium does not keep the card focused inside
      // it once focus has moved to the modal's iframe, so focus lands on the
      // iframe, not the card (putting it on the card needs a bridge message).
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        lang={lang}
        className="relative"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          aria-label={labels.close}
        >
          <XIcon size={18} weight="bold" aria-hidden="true" />
        </button>

        {children}
      </div>
    </div>,
    document.body,
  );
};
