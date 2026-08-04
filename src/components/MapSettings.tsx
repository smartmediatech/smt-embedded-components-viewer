import { useState, useCallback } from "react";
import { Field } from "@base-ui/react/field";
import { Separator } from "@base-ui/react/separator";
import { useApp } from "../context/AppContext";

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-black placeholder:text-black/30 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30";

const labelClass = "block text-xs text-black/40 dark:text-white/40 mb-1";

const sectionHeadingClass =
  "text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wide";

const primaryBtnClass =
  "w-full rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white transition-colors cursor-pointer hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-white/80";

const secondaryBtnClass =
  "w-full rounded-full border border-black/10 bg-transparent px-4 py-1.5 text-sm font-medium text-black transition-colors cursor-pointer hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed dark:border-white/10 dark:text-white dark:hover:bg-white/10";

export const MapSettings = () => {
  const { explicitLang, explicitTheme, mapIframeHandle, mapQueryParams, setMapQueryParams, currentIframeUrl } = useApp();

  const [lat, setLat] = useState(() =>
    mapQueryParams.lat != null ? String(mapQueryParams.lat) : "",
  );
  const [lon, setLon] = useState(() =>
    mapQueryParams.lon != null ? String(mapQueryParams.lon) : "",
  );
  const [zoom, setZoom] = useState(() =>
    mapQueryParams.zoom != null ? String(mapQueryParams.zoom) : "",
  );

  const handleApplyQueryParams = useCallback(() => {
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const parsedZoom = parseFloat(zoom);
    setMapQueryParams({
      ...(isNaN(parsedLat) ? {} : { lat: parsedLat }),
      ...(isNaN(parsedLon) ? {} : { lon: parsedLon }),
      ...(isNaN(parsedZoom) ? {} : { zoom: parsedZoom }),
    });
  }, [lat, lon, zoom, setMapQueryParams]);

  const handleGoToLocation = useCallback(async () => {
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) return;
    const parsedZoom = parseFloat(zoom);
    try {
      await mapIframeHandle?.request("map.viewport.set", {
        center: {
          latitude: parsedLat,
          longitude: parsedLon,
        },
        ...(!isNaN(parsedZoom) ? { zoom: parsedZoom } : {}),
      });
    } catch (error) {
      console.error("Go to location failed:", error);
    }
  }, [lat, lon, zoom, mapIframeHandle]);

  const handleGoToUserLocation = useCallback(async () => {
    try {
      await mapIframeHandle?.request("map.userLocation.focus", {});
    } catch (error) {
      console.error("Go to user location failed:", error);
    }
  }, [mapIframeHandle]);

  const canApply = lat !== "" || lon !== "" || zoom !== "";
  const canGoTo = !!mapIframeHandle && lat !== "" && lon !== "";

  return (
    <div className="mt-4 space-y-0">
      {/* Query section */}
      <div className="mb-3">
        <p className={sectionHeadingClass}>Query</p>
        <p className="text-xs text-black/30 dark:text-white/30">Params used to initialise the component</p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Field.Root>
            <Field.Label className={labelClass}>lang</Field.Label>
            <Field.Control
              render={<input />}
              value={explicitLang ?? ""}
              readOnly
              disabled
              className={inputClass}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label className={labelClass}>theme</Field.Label>
            <Field.Control
              render={<input />}
              value={explicitTheme ?? ""}
              readOnly
              disabled
              className={inputClass}
            />
          </Field.Root>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field.Root>
            <Field.Label className={labelClass}>lat</Field.Label>
            <Field.Control
              render={<input />}
              type="text"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 46.204"
              className={inputClass}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label className={labelClass}>lon</Field.Label>
            <Field.Control
              render={<input />}
              type="text"
              inputMode="decimal"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="e.g. 6.143"
              className={inputClass}
            />
          </Field.Root>
        </div>

        <Field.Root>
          <Field.Label className={labelClass}>zoom</Field.Label>
          <Field.Control
            render={<input />}
            type="text"
            inputMode="decimal"
            value={zoom}
            onChange={(e) => setZoom(e.target.value)}
            placeholder="e.g. 14"
            className={inputClass}
          />
        </Field.Root>

        <button
          type="button"
          onClick={handleApplyQueryParams}
          disabled={!canApply}
          className={primaryBtnClass}
        >
          Apply to URL
        </button>

        {currentIframeUrl && (
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2">
            <p className="text-xs text-black/40 dark:text-white/40 mb-1">Component URL</p>
            <p className="font-mono text-xs text-black/60 dark:text-white/50 break-all leading-relaxed">{currentIframeUrl}</p>
          </div>
        )}
      </div>

      <Separator className="border-t border-black/10 dark:border-white/10 my-4" />

      {/* Bridge section */}
      <div className="mb-3">
        <p className={sectionHeadingClass}>Bridge</p>
        <p className="text-xs text-black/30 dark:text-white/30">Update the component after it has mounted</p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGoToLocation}
          disabled={!canGoTo}
          className={primaryBtnClass}
        >
          Go to Location
        </button>

        <button
          type="button"
          onClick={handleGoToUserLocation}
          disabled={!mapIframeHandle}
          className={secondaryBtnClass}
        >
          Go to My Location
        </button>
      </div>
    </div>
  );
};
