import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BridgedIframe } from "../components/BridgedIframe";
import { useApp } from "../context/AppContext";

export const Collection = () => {
  const { smartComponentsHost, setCurrentIframeUrl, appendUrlParams, bootMode } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Deep link to one ticket: the component opens it instead of the grid.
  const focusTicket = searchParams.get("focusTicket") ?? undefined;
  const src = appendUrlParams(`${smartComponentsHost}/collection/`, { focusTicket });
  useEffect(() => {
    setCurrentIframeUrl(src);
    return () => setCurrentIframeUrl(null);
  }, [src, setCurrentIframeUrl]);

  // Collection's "Go to Marketplace" link relies on this — without a
  // page-specific handler, navigation.go falls through to BridgedIframe's
  // default (which only special-cases "map") and never actually navigates.
  const onNavigation = useCallback(
    async (feature: string, focus?: string) => {
      if (feature === "marketplace") {
        navigate(focus ? `/marketplace?focusItem=${encodeURIComponent(focus)}` : "/marketplace");
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
