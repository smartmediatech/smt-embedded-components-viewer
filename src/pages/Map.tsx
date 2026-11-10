import { useCallback, useEffect } from "react";
import { BridgedIframe, BridgedIframeHandle } from "../components/BridgedIframe";
import { TENANTS, useApp } from "../context/AppContext";

export const Map = () => {
  const {
    legacyComponentsHost,
    tenant,
    mapComponentConfig,
    mapQueryParams,
    pendingMapCommand,
    clearPendingMapCommand,
    mapIframeHandle,
    setMapIframeHandle,
    setCurrentIframeUrl,
    appendUrlParams,
    bootMode,
  } = useApp();

  const handleRef = useCallback(
    (handle: BridgedIframeHandle | null) => {
      setMapIframeHandle(handle);
    },
    [setMapIframeHandle],
  );

  // The legacy map reads its tenant from a config file next to it, defaulting to
  // ./map-config.json, which a host can only have one of. config_url picks the
  // tenant's own map-config.<fqdn>.json instead, so one map serves every tenant.
  // A bare file name, not "./…": the map does not URL-decode the value, and
  // URLSearchParams would send the slash as %2F.
  const fqdn = TENANTS[tenant]?.fqdn;
  const src = appendUrlParams(`${legacyComponentsHost}/map/`, {
    config_url: fqdn ? `map-config.${fqdn}.json` : undefined,
    lat: mapQueryParams.lat != null ? String(mapQueryParams.lat) : undefined,
    lon: mapQueryParams.lon != null ? String(mapQueryParams.lon) : undefined,
    zoom: mapQueryParams.zoom != null ? String(mapQueryParams.zoom) : undefined,
  });
  useEffect(() => {
    setCurrentIframeUrl(src);
    return () => setCurrentIframeUrl(null);
  }, [src, setCurrentIframeUrl]);

  useEffect(() => {
    return () => setMapIframeHandle(null);
  }, [setMapIframeHandle]);

  useEffect(() => {
    if (!pendingMapCommand || !mapIframeHandle) {
      return;
    }

    // Commands are queued briefly when the host navigates to /map before the iframe bridge is ready.
    let cancelled = false;

    const sendPendingMapCommand = async () => {
      try {
        if (pendingMapCommand.type === "viewport") {
          await mapIframeHandle.request("map.viewport.set", {
            center: pendingMapCommand.center,
            ...(pendingMapCommand.zoom != null ? { zoom: pendingMapCommand.zoom } : {}),
          });
        } else {
          await mapIframeHandle.request("map.userLocation.focus", {
            ...(pendingMapCommand.zoom != null ? { zoom: pendingMapCommand.zoom } : {}),
          });
        }
      } catch (error) {
        console.error("Sending pending map command failed:", error);
      } finally {
        if (!cancelled) {
          clearPendingMapCommand();
        }
      }
    };

    void sendPendingMapCommand();

    return () => {
      cancelled = true;
    };
  }, [pendingMapCommand, clearPendingMapCommand, mapIframeHandle]);

  return (
    <>
      <BridgedIframe
        ref={handleRef}
        src={src}
        className="w-full h-full rounded-lg shadow-lg border-0 grow"
        componentConfig={mapComponentConfig}
        useRefreshToken={bootMode === "refresh-token"}
      />
    </>
  );
};
