import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BridgedIframe,
  BridgedIframeHandle,
} from "../components/BridgedIframe";
import { ComponentModal } from "../components/ComponentModal";
import { useApp } from "../context/AppContext";
import { useA11yLabels } from "../i18n/a11yLabels";

export const Discover = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalFocus, setModalFocus] = useState<{
    id: string;
    type: "card" | "reward" | "wearable";
  }>();

  const { smartComponentsHost, setCurrentIframeUrl, appendUrlParams, bootMode } = useApp();
  const { labels } = useA11yLabels();
  const iframeRef = useRef<BridgedIframeHandle>(null);
  const navigate = useNavigate();

  const src = appendUrlParams(`${smartComponentsHost}/discover/`);
  useEffect(() => {
    setCurrentIframeUrl(src);
    return () => setCurrentIframeUrl(null);
  }, [src, setCurrentIframeUrl]);

  const onNavigation = useCallback(async (feature: string, focus?: string) => {
    if (feature === "discover") {
      setModalFocus(undefined);
      setShowModal(false);
    } else if (feature === "challenges") {
      navigate("/challenges");
    } else if (feature === "rewards") {
      navigate("/rewards");
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
  }, [navigate]);

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
              src={appendUrlParams(`${smartComponentsHost}/card/?id=${modalFocus.id}&origin=discover`)}
              className="w-full h-full rounded-lg shadow-2xl border-0"
              onNavigation={onNavigation}
              useRefreshToken={bootMode === "refresh-token"}
            />
          )}
          {modalFocus?.type === "reward" && (
            <BridgedIframe
              src={appendUrlParams(`${smartComponentsHost}/reward/?id=${modalFocus.id}&origin=discover`)}
              className="w-full h-full rounded-lg shadow-2xl border-0"
              onNavigation={onNavigation}
              useRefreshToken={bootMode === "refresh-token"}
            />
          )}
          {modalFocus?.type === "wearable" && (
            <BridgedIframe
              src={appendUrlParams(`${smartComponentsHost}/wearable/?id=${modalFocus.id}&origin=discover`)}
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
