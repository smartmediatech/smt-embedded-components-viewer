import { useState, useRef, useEffect, useCallback } from "react";
import {
  BridgedIframe,
  BridgedIframeHandle,
} from "../components/BridgedIframe";
import { ComponentModal } from "../components/ComponentModal";
import { useApp } from "../context/AppContext";
import { useA11yLabels } from "../i18n/a11yLabels";

export const Rewards = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalFocus, setModalFocus] = useState<{
    id: string;
    type: "card" | "reward" | "wearable";
  }>();

  const { smartComponentsHost, setCurrentIframeUrl, appendUrlParams, bootMode } = useApp();
  const { labels } = useA11yLabels();
  const iframeRef = useRef<BridgedIframeHandle>(null);

  const src = appendUrlParams(`${smartComponentsHost}/rewards/`);
  useEffect(() => {
    setCurrentIframeUrl(src);
    return () => setCurrentIframeUrl(null);
  }, [src, setCurrentIframeUrl]);

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
        <ComponentModal label={labels[modalFocus?.type ?? "card"]} onClose={() => setShowModal(false)}>
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
        </ComponentModal>
      )}
    </>
  );
};
