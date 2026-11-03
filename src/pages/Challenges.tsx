import { useState, useRef, useEffect, useCallback } from "react";
import {
  BridgedIframe,
  BridgedIframeHandle,
} from "../components/BridgedIframe";
import { ComponentModal } from "../components/ComponentModal";
import { useApp } from "../context/AppContext";
import { useA11yLabels } from "../i18n/a11yLabels";

export const Challenges = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalFocus, setModalFocus] = useState<string | undefined>();
  const { smartComponentsHost, setCurrentIframeUrl, appendUrlParams, bootMode } = useApp();
  const { labels } = useA11yLabels();
  const iframeRef = useRef<BridgedIframeHandle>(null);

  const src = appendUrlParams(`${smartComponentsHost}/challenges/`);
  useEffect(() => {
    setCurrentIframeUrl(src);
    return () => setCurrentIframeUrl(null);
  }, [src, setCurrentIframeUrl]);

  const onNavigation = useCallback(async (feature: string, focus?: string) => {
    if (feature === "engaged" && focus) {
      setModalFocus(focus);
      setShowModal(true);
    }
    return undefined;
  }, []);

  const onModalNavigation = useCallback(async (feature: string, focus?: string) => {
    if (feature === "engaged" && focus) {
      setModalFocus(focus);
    } else {
      setShowModal(false);
    }
    return undefined;
  }, []);

  return (
    <>
      <BridgedIframe
        ref={iframeRef}
        src={src}
        className="w-full h-full rounded-lg shadow-lg border-0 flex-1"
        onNavigation={onNavigation}
        sizeToContent
        useRefreshToken={bootMode === "refresh-token"}
      />

      {showModal && (
        <ComponentModal label={labels.card} onClose={() => setShowModal(false)}>
          <BridgedIframe
            src={appendUrlParams(`${smartComponentsHost}/card/?id=${modalFocus}&origin=challenges`)}
            className="w-full h-full rounded-lg shadow-2xl border-0"
            onNavigation={onModalNavigation}
            useRefreshToken={bootMode === "refresh-token"}
          />
        </ComponentModal>
      )}
    </>
  );
};
