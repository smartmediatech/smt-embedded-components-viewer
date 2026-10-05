import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BridgedIframe } from "../components/BridgedIframe";
import { useApp } from "../context/AppContext";

export const Profile = () => {
  const { smartComponentsHost, setCurrentIframeUrl, appendUrlParams, bootMode } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Deep link to one section (account, payments, payouts, settings).
  const focus = searchParams.get("focus") ?? undefined;
  const src = appendUrlParams(`${smartComponentsHost}/profile/`, { focus });
  useEffect(() => {
    setCurrentIframeUrl(src);
    return () => setCurrentIframeUrl(null);
  }, [src, setCurrentIframeUrl]);

  const onNavigation = useCallback(
    async (feature: string) => {
      if (feature === "collection" || feature === "marketplace") {
        navigate(`/${feature}`);
      }
      return undefined;
    },
    [navigate],
  );

  // Logout and account deletion arrive as session.clear, which BridgedIframe
  // already answers by signing out and returning to /login.
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
