import { useState, useRef, useEffect, useCallback } from "react";
import { XIcon } from "@phosphor-icons/react";
import {
  BridgedIframe,
  BridgedIframeHandle,
} from "../components/BridgedIframe";
import { useApp } from "../context/AppContext";

export const Rewards = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalFocus, setModalFocus] = useState<{
    id: string;
    type: "card" | "reward" | "wearable";
  }>();
  const [modalDimensions, setModalDimensions] = useState({
    width: 0,
    height: 0,
  });

  const { smartComponentsHost, setCurrentIframeUrl, appendUrlParams, bootMode } = useApp();
  const iframeRef = useRef<BridgedIframeHandle>(null);

  const src = appendUrlParams(`${smartComponentsHost}/rewards/`);
  useEffect(() => {
    setCurrentIframeUrl(src);
    return () => setCurrentIframeUrl(null);
  }, [src, setCurrentIframeUrl]);

  useEffect(() => {
    const calculateDimensions = () => {
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

      setModalDimensions({ width, height });
    };

    calculateDimensions();
    window.addEventListener("resize", calculateDimensions);
    return () => window.removeEventListener("resize", calculateDimensions);
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  const onNavigation = useCallback(async (feature: string, focus?: string) => {
    if (feature === "discover") {
      setModalFocus(undefined);
      setShowModal(false);
    } else if (feature === "engaged" && focus) {
      setModalFocus({ id: focus, type: "card" });
      setShowModal(true);
    } else if (feature === "reward" && focus) {
      setModalFocus({ id: focus, type: "reward" });
      setShowModal(true);
    } else if (feature === "ar-face-filter" && focus) {
      setModalFocus({ id: focus, type: "wearable" });
      setShowModal(true);
    }
    return undefined;
  }, []);

  return (
    <>
      <BridgedIframe
        ref={iframeRef}
        src={src}
        className="w-full h-full rounded-lg shadow-lg border-0 grow"
        onNavigation={onNavigation}
        sizeToContent
        useRefreshToken={bootMode === "refresh-token"}
      />

      {showModal && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative"
            style={{
              width: `${modalDimensions.width}px`,
              height: `${modalDimensions.height}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute -top-12 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Close modal"
            >
              <XIcon size={18} weight="bold" aria-hidden="true" />
            </button>

            {modalFocus?.type === "card" && (
              <BridgedIframe
                src={appendUrlParams(`${smartComponentsHost}/card/?id=${modalFocus.id}&origin=rewards`)}
                className="w-full h-full rounded-lg shadow-2xl border-0"
                onNavigation={onNavigation}
                useRefreshToken={bootMode === "refresh-token"}
              />
            )}
            {modalFocus?.type === "reward" && (
              <BridgedIframe
                src={appendUrlParams(`${smartComponentsHost}/reward/?id=${modalFocus.id}&origin=rewards`)}
                className="w-full h-full rounded-lg shadow-2xl border-0"
                onNavigation={onNavigation}
                useRefreshToken={bootMode === "refresh-token"}
              />
            )}
            {modalFocus?.type === "wearable" && (
              <BridgedIframe
                src={appendUrlParams(`${smartComponentsHost}/wearable/?id=${modalFocus.id}&origin=rewards`)}
                className="w-full h-full rounded-lg shadow-2xl border-0"
                onNavigation={onNavigation}
                useRefreshToken={bootMode === "refresh-token"}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};
