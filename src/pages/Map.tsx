import { useCallback, useEffect, useState } from "react";
import {
  BridgedIframe,
  BridgedIframeHandle,
  ComponentInteraction,
} from "../components/BridgedIframe";
import { ComponentModal } from "../components/ComponentModal";
import { TENANTS, useApp } from "../context/AppContext";
import { useA11yLabels } from "../i18n/a11yLabels";

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
    smartComponentsHost,
  } = useApp();
  const { labels } = useA11yLabels();
  const [cardId, setCardId] = useState<string | undefined>();

  // After a pickup the map reports interaction { action: "pickup", status:
  // "completed", smtId }. It is the only message that names the picked-up SMT
  // (the navigation.go "inventory" that follows has no id), and the map cannot
  // show an SMT itself, so the host opens its card.
  const onInteraction = useCallback((interaction: ComponentInteraction) => {
    if (interaction.action === "pickup" && interaction.status === "completed" && interaction.smtId) {
      setCardId(interaction.smtId);
    }
  }, []);

  const onCardNavigation = useCallback(async (feature: string, focus?: string) => {
    if (feature === "engaged" && focus) {
      setCardId(focus);
    } else {
      setCardId(undefined);
    }
    return undefined;
  }, []);

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
        onInteraction={onInteraction}
        useRefreshToken={bootMode === "refresh-token"}
      />

      {cardId && (
        <ComponentModal label={labels.card} onClose={() => setCardId(undefined)}>
          <BridgedIframe
            src={appendUrlParams(`${smartComponentsHost}/card/`, {
              id: cardId,
              origin: "map",
            })}
            className="w-full h-full rounded-lg shadow-2xl border-0"
            onNavigation={onCardNavigation}
            useRefreshToken={bootMode === "refresh-token"}
          />
        </ComponentModal>
      )}
    </>
  );
};
