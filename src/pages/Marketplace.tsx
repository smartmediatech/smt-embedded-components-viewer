import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BridgedIframe } from "../components/BridgedIframe";
import { useApp } from "../context/AppContext";

export const Marketplace = () => {
  const { smartComponentsHost, setCurrentIframeUrl, appendUrlParams, bootMode } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Deep-links a specific listing straight to its detail view — set by
  // Discover's "Fans selling right now" preview rows.
  const focusItem = searchParams.get("focusItem") ?? undefined;

  const src = appendUrlParams(`${smartComponentsHost}/marketplace/`, { focusItem });
  useEffect(() => {
    setCurrentIframeUrl(src);
    return () => setCurrentIframeUrl(null);
  }, [src, setCurrentIframeUrl]);

  // The marketplace component keeps the seller flow in-place: listing and
  // cancellation both resolve inside its own workflow polling, so there is no
  // deeplink to host in a modal here.
  // The purchase result's "See your tickets" relies on this — without a
  // page-specific handler, navigation.go falls through to BridgedIframe's
  // default (which only special-cases "map") and never actually navigates.
  const onNavigation = useCallback(
    async (feature: string, focus?: string) => {
      if (feature === "collection") {
        navigate(focus ? `/collection?focusTicket=${encodeURIComponent(focus)}` : "/collection");
      }
      return undefined;
    },
    [navigate],
  );

  return (
    <BridgedIframe
      src={src}
      className="w-full h-full border-0 grow"
      onNavigation={onNavigation}
      sizeToContent
      useRefreshToken={bootMode === "refresh-token"}
    />
  );
};
