import { Field } from "@base-ui/react/field";
import { useApp } from "../context/AppContext";

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-black placeholder:text-black/30 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30";

const labelClass = "block text-xs text-black/40 dark:text-white/40 mb-1";

const sectionHeadingClass =
  "text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wide";

export const ComponentSettings = () => {
  const { explicitLang, explicitTheme, currentIframeUrl } = useApp();

  return (
    <div className="mt-4 space-y-0">
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

        {currentIframeUrl && (
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2">
            <p className="text-xs text-black/40 dark:text-white/40 mb-1">Component URL</p>
            <p className="font-mono text-xs text-black/60 dark:text-white/50 break-all leading-relaxed">{currentIframeUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
};
