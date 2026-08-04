import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getViewerConfig } from "../config/viewerConfig";
import { authService } from "../services/authService";
import ParentBridge from "@/types/smt-base-bridge/parent-bridge";
import Swal from "sweetalert2";

// Extend Window interface to include OneTrust
declare global {
  interface Window {
    OneTrust?: {
      OnConsentChanged: (callback: () => void) => void;
      IsAlertBoxClosed: () => boolean;
    };
    OnetrustActiveGroups?: string;
  }
}

interface BridgedIframeProps {
  src: string;
  className?: string;
  useRefreshToken?: boolean;
  sizeToContent?: boolean;
  componentConfig?: Record<string, unknown>;
  onNavigation?: (
    feature: string,
    focus?: string,
    extra?: string,
    params?: Record<string, string | boolean | number>,
  ) => Promise<
    | {
        feature: string;
        focus?: string;
        extra?: string;
        params: Record<string, string | boolean | number>;
      }
    | undefined
  >;
}

export interface BridgedIframeHandle {
  // Convenience helpers for pages that need to talk to an already-mounted child iframe.
  goTo: (params: {
    feature: string;
    focus?: string;
    extra?: string;
    params?: Record<string, any>;
  }) => Promise<unknown>;
  request: <TResult = unknown>(
    name: string,
    payload?: Record<string, any>,
  ) => Promise<TResult>;
}

export const BridgedIframe = forwardRef<
  BridgedIframeHandle,
  BridgedIframeProps
>(
  ({ src, className, onNavigation, useRefreshToken, sizeToContent, componentConfig }, ref) => {
  const {
    suppressReferrer,
    setMapQueryParams,
    mapIframeHandle,
    setPendingMapCommand,
  } = useApp();
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const bridgeRef = useRef<ParentBridge | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);
  const onNavigationRef = useRef(onNavigation);
  const useRefreshTokenRef = useRef(useRefreshToken);
  const componentConfigRef = useRef(componentConfig);
  // Keep the latest props available to bridge handlers without tearing down the bridge.
  useEffect(() => {
    onNavigationRef.current = onNavigation;
  }, [onNavigation]);
  useEffect(() => {
    useRefreshTokenRef.current = useRefreshToken;
  }, [useRefreshToken]);
  useEffect(() => {
    componentConfigRef.current = componentConfig;
  }, [componentConfig]);

 const getCookie = (name: string): string | null => {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
};

// Consent group that gates tracking — configured, not hardcoded, since it
// differs per OneTrust tenant.
const consentGroup = getViewerConfig().oneTrust?.consentGroup ?? "C0002";

// Helper function to check OneTrust consent
const checkOneTrustConsent = useCallback((): {
  canTrack: boolean;
  isReady: boolean;
} => {
  // OneTrust script not loaded yet
  if (!window.OneTrust) {
    return { canTrack: false, isReady: false };
  }

  // True once user has interacted with banner / preference center
  const hasInteracted = !!getCookie("OptanonAlertBoxClosed");

  // Active consent groups
  const activeGroups = window.OnetrustActiveGroups || "";
  const activeGroupList = activeGroups
      .split(",")
      .map((group) => group.trim())
      .filter((group) => group.length > 0);
    const canTrack = activeGroupList.includes(consentGroup);

  return {
    canTrack,
    isReady: hasInteracted,
  };
}, [consentGroup]);

const isBridgeErrorCode = (error: unknown, code: string): error is { code: string } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
};

  // Send consent update to child iframe
  const sendConsentUpdate = useCallback(() => {
    if (!bridgeRef.current) return;

    const consentStatus = checkOneTrustConsent();
    console.log("Sending consent update to child:", consentStatus);

    void bridgeRef.current
      .sendRequest("tracking.consent.update", consentStatus)
      .catch((error: unknown) => {
        if (isBridgeErrorCode(error, "NOT_SUPPORTED")) {
          console.log("Child iframe does not support tracking.consent.update");
          return;
        }

        console.error("Error sending consent update:", error);
      });
  }, [checkOneTrustConsent]);

  const setIframeRef = useCallback(
    (element: HTMLIFrameElement | null) => {
      if (element !== iframe) {
        setIframe(element);
      }
    },
    [iframe],
  );

  // Set up OneTrust consent change listener.
  //
  // OneTrust is injected at runtime from config.json, so window.OneTrust is
  // usually NOT populated when this effect first runs — registering only once
  // would mean consent changes are never pushed to the iframes. Poll briefly
  // until the script lands, then register.
  useEffect(() => {
    let registered = false;
    let timer: number | undefined;

    const tryRegister = () => {
      if (registered) return true;
      if (!window.OneTrust) return false;

      window.OneTrust.OnConsentChanged(() => {
        console.log("OneTrust consent changed");
        sendConsentUpdate();
      });
      registered = true;
      console.log("OneTrust consent listener registered");
      return true;
    };

    if (!tryRegister()) {
      // ~10s of grace, then give up quietly: a deployment with no oneTrust
      // block in its config legitimately never loads the script.
      let attempts = 0;
      timer = window.setInterval(() => {
        attempts += 1;
        if (tryRegister() || attempts > 40) {
          window.clearInterval(timer);
        }
      }, 250);
    }

    return () => {
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [sendConsentUpdate]);

  useEffect(() => {
    if (!iframe) {
      console.error("Iframe not available");
      return;
    }

    if (!window.SMTBaseBridge) {
      console.error("SMTBaseBridge not available on window object");
      console.log(
        "Available window properties:",
        Object.keys(window).filter(
          (k) =>
            k.toLowerCase().includes("bridge") ||
            k.toLowerCase().includes("smt"),
        ),
      );
      return;
    }

    const BridgeError = window.SMTBaseBridge.BridgeError;
    const childOrigin = new URL(src);
    // Create the bridge before setting iframe src so the child can request data immediately on load.
    const bridge = new window.SMTBaseBridge.ParentBridge(iframe, {
      origin: childOrigin.origin,
      meta: {},
    });
    bridgeRef.current = bridge;

    // Core bridge handlers expose shared host capabilities to every component.
    bridge.addRequestHandler("tracking.consent.request", async () => {
      const consentStatus = checkOneTrustConsent();
      console.log("[ComponentBridge] 'tracking.consent.request' called, returning:", consentStatus);
      return consentStatus;
    });

    // Components can pull their initial host-owned config on startup.
    bridge.addRequestHandler("component.config.get", async () => {
      return componentConfigRef.current ?? {};
    });

    // Child components ask the host for auth instead of owning tokens directly.
    bridge.addRequestHandler("session.get", async () => {
      // Access token or refresh token is supported
      if (useRefreshTokenRef.current) {
        const refreshToken = authService.getRefreshToken();
        console.log(
          "[ComponentBridge] 'session.get' called, returning refreshToken:",
          refreshToken ? "present" : "null",
        );
        return { refreshToken };
      } else {
        //If returning Access token, you are expected to manage the refresh token life cycle
        const accessToken = await authService.getAccessToken();
        console.log(
          "[ComponentBridge] 'session.get' called, returning accessToken:",
          accessToken ? "present" : "null",
        );
        return { accessToken };
      }
    });

    // Embedded logout is routed back through the host app.
    bridge.addRequestHandler("session.clear", async () => {
      console.log("[ComponentBridge] 'session.clear' called");
      await authService.logout();
      navigate("/login");
      return {};
    });

    bridge.addRequestHandler("navigation.go", async ({ payload }) => {
      console.log("[ComponentBridge] 'navigation.go' called with params:", payload);
      const { feature, focus, extra, params } = payload as {
        feature: string;
        focus: string;
        extra: string;
        params: Record<string, any>;
      };
      if (onNavigationRef.current) {
        const result = await onNavigationRef.current(feature, focus, extra, params);
        if (result !== undefined) return result;
        // undefined = page didn't handle it, fall through to default
      }
      if (feature === "map") {
        // The map uses URL params for initial state and dedicated map.* commands for live actions.
        const lat = Number.parseFloat(String(params?.lat));
        const lon = Number.parseFloat(String(params?.lon));
        const zoom = Number.parseFloat(String(params?.zoom));
        const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);
        const hasZoom = Number.isFinite(zoom);
        const wantsUserLocation =
          params?.userLocation === true || params?.userLocation === "true";

        if (locationRef.current.pathname === "/map") {
          if (wantsUserLocation) {
            if (mapIframeHandle) {
              try {
                await mapIframeHandle.request("map.userLocation.focus", {
                  ...(hasZoom ? { zoom } : {}),
                });
                return {};
              } catch (error) {
                console.warn("map.userLocation.focus failed", error);
              }
            }
            // If the iframe is not ready yet, queue a one-shot command for the map page to consume.
            setPendingMapCommand({
              type: "user-location",
              ...(hasZoom ? { zoom } : {}),
            });
            return {};
          }

          if (hasCoordinates) {
            if (mapIframeHandle) {
              try {
                await mapIframeHandle.request("map.viewport.set", {
                  center: { latitude: lat, longitude: lon },
                  ...(hasZoom ? { zoom } : {}),
                });
                return {};
              } catch (error) {
                console.warn("map.viewport.set failed", error);
              }
            }
            // If the iframe is not ready yet, queue a one-shot viewport command for the map page to consume.
            setPendingMapCommand({
              type: "viewport",
              center: { latitude: lat, longitude: lon },
              ...(hasZoom ? { zoom } : {}),
            });
            return {};
          }

          navigate("/map");
          return {};
        }

        if (wantsUserLocation) {
          setPendingMapCommand({
            type: "user-location",
            ...(hasZoom ? { zoom } : {}),
          });
          navigate("/map");
          return {};
        }

        if (hasCoordinates) {
          // When opening the map page from elsewhere, carry initial viewport through the URL.
          setMapQueryParams({
            lat,
            lon,
            ...(hasZoom ? { zoom } : {}),
          });
          navigate("/map");
          return {};
        }

        navigate("/map");
        return {};
      }
      if (
        feature === "ar" ||
        feature === "ar-face-filter" ||
        feature === "ar-wearable" ||
        feature === "ar-engaged" ||
        feature === "eight-wall"
      ) {
        alert("Request to goto " + feature + " rejected");
        return {};
      }
      //supported route
      return { feature, focus, extra, params };
    });

    bridge.addRequestHandler("navigation.open", async ({ payload }) => {
      console.log("[ComponentBridge] 'navigation.open' called with params:", payload);
      const url = (payload as { url?: unknown } | undefined)?.url;

      // The URL crosses the bridge from the iframe, so treat it as untrusted:
      //  - restrict to http(s), or a `javascript:` URL would execute in this
      //    (host) document rather than the iframe's;
      //  - noopener, or the opened tab can reach back through window.opener and
      //    navigate this page (reverse tabnabbing).
      if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
        console.warn("[ComponentBridge] refused navigation.open for:", url);
        return new BridgeError(
          "INVALID_PARAMETER",
          "navigation.open requires an http(s) url",
        ).toJson();
      }

      window.open(url, "_blank", "noopener,noreferrer");
      return {};
    });


    // Return a bridge error for host features this example container does not implement.
    bridge.addRequestHandler("alert.notify", async () => {
      return new BridgeError("NOT_SUPPORTED", "alert.notify is not supported").toJson();
    });

    bridge.addRequestHandler("alert.notifyDetail", async () => {
      return new BridgeError(
        "NOT_SUPPORTED",
        "alert.notifyDetail is not supported",
      ).toJson();
    });

    bridge.addRequestHandler("alert.confirm", async () => {
      return new BridgeError("NOT_SUPPORTED", "alert.confirm is not supported").toJson();
    });

    bridge.addRequestHandler("alert.inform", async () => {
      return new BridgeError("NOT_SUPPORTED", "alert.inform is not supported").toJson();
    });

    // The child can ask the host to present a full-page loading state.
    bridge.addRequestHandler("loader.show", async ({ payload }) => {
      const { label } = payload as { label: string };

      Swal.fire({
        title: label || "Loading...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      return {};
    });

    bridge.addRequestHandler("loader.hide", async () => {
      Swal.close();
      return {};
    });

    // Inline components can request height changes when sizeToContent is enabled.
    bridge.addRequestHandler("frame.resize", async ({ payload }) => {
      if (!sizeToContent) {
        return new BridgeError(
          "NOT_SUPPORTED",
          "frame.resize is not supported when sizeToContent is disabled",
        ).toJson();
      }

      const { height } = payload as { height: number };
      if (typeof height !== "number" || height < 0) {
        return new BridgeError(
          "INVALID_PARAMETER",
          "height must be a positive number",
        ).toJson();
      }

      if (iframe) {
        iframe.style.height = `${height}px`;
        console.log(`Iframe height resized to ${height}px`);
      }

      return {};
    });

    console.log("Bridge handlers registered successfully");

    // Only start loading the child once all handlers are in place.
    setIframeLoaded(false);
    setIframeSrc(src);

    // Send initial consent status once bridge is ready
    // Use a small delay to ensure child is ready to receive
    const consentTimer = setTimeout(() => {
      sendConsentUpdate();
    }, 1000);

    // Cleanup
    return () => {
      clearTimeout(consentTimer);
      if (bridge) {
        bridge.sendRequest("session.clear", {}).catch(() => {});
        bridge.removeRequestHandler("tracking.consent.request");
        bridge.removeRequestHandler("component.config.get");
        bridge.removeRequestHandler("session.get");
        bridge.removeRequestHandler("session.clear");
        bridge.removeRequestHandler("navigation.go");
        bridge.removeRequestHandler("navigation.open");
        bridge.removeRequestHandler("alert.notify");
        bridge.removeRequestHandler("alert.notifyDetail");
        bridge.removeRequestHandler("alert.confirm");
        bridge.removeRequestHandler("alert.inform");
        bridge.removeRequestHandler("loader.show");
        bridge.removeRequestHandler("loader.hide");
        bridge.removeRequestHandler("frame.resize");
        bridge.dispose();
        if (bridgeRef.current === bridge) {
          bridgeRef.current = null;
        }
      }
      // Close any open SweetAlert modals on cleanup
      Swal.close();
    };
  }, [
    src,
    navigate,
    iframe,
    sizeToContent,
    useRefreshToken,
    checkOneTrustConsent,
    sendConsentUpdate,
    setMapQueryParams,
    mapIframeHandle,
    setPendingMapCommand,
  ]);

  useEffect(() => {
    if (!bridgeRef.current || !iframeSrc || !iframeLoaded) {
      return;
    }

    // Live config updates are replay-safe, so they are pushed whenever the prop changes.
    bridgeRef.current
      .sendRequest("component.config.update", componentConfig ?? {})
      .catch((error) => {
        console.warn("component.config.update failed", error);
      });
  }, [componentConfig, iframeSrc, iframeLoaded]);

  useImperativeHandle(ref, () => ({
    goTo: async (params: {
      feature: string;
      focus?: string;
      extra?: string;
      params?: Record<string, any>;
    }) => {
      if (!bridgeRef.current) {
        throw new Error("Bridge not initialized");
      }
      // navigation.go is the generic route-level request shared by components.
      return bridgeRef.current.sendRequest("navigation.go", params);
    },
    request: async <TResult = unknown>(
      name: string,
      payload: Record<string, any> = {},
    ): Promise<TResult> => {
      if (!bridgeRef.current) {
        throw new Error("Bridge not initialized");
      }
      // request() exposes namespaced component-specific commands such as map.viewport.set.
      return bridgeRef.current.sendRequest(name, payload) as Promise<TResult>;
    },
  }), []);

  return (
    <iframe
      key={`${String(useRefreshToken)}-${String(suppressReferrer)}`}
      ref={setIframeRef}
      src={iframeSrc || undefined}
      className={className}
      title="Embedded Content"
      onLoad={() => setIframeLoaded(true)}
      allow="geolocation; camera; microphone; fullscreen; autoplay; clipboard-write; encrypted-media; gyroscope; accelerometer; web-share; xr-spatial-tracking"
      referrerPolicy={suppressReferrer ? "no-referrer" : undefined}
    />
  );
  },
);

BridgedIframe.displayName = "BridgedIframe";
