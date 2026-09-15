import { Select } from "@base-ui/react/select";
import { CheckIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import { useApp } from "../context/AppContext";

const LANGUAGES = [
  { code: "ar", label: "Arabic" },
  { code: "da", label: "Danish" },
  { code: "de", label: "German" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "id", label: "Indonesian" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "nl", label: "Dutch" },
  { code: "pt", label: "Portuguese" },
];

interface LanguageSelectProps {
  /** "dark" renders against a permanently-dark surface (the sidebar), independent of the app's light/dark theme toggle. */
  tone?: "light" | "dark";
}

export const LanguageSelect = ({ tone = "light" }: LanguageSelectProps = {}) => {
  const isDark = tone === "dark";
  const { explicitLang, setLanguage } = useApp();

  return (
    <Select.Root
      value={explicitLang}
      onValueChange={(value) => {
        if (value !== null) setLanguage(value);
      }}
    >
      <Select.Trigger
        aria-label="Select language"
        className={`flex h-8 min-w-16 items-center justify-center gap-1.5 rounded-sm border px-3 font-display text-sm font-medium uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer ${
          isDark
            ? explicitLang
              ? "border-white/15 bg-white/5 text-white hover:border-white/30 focus-visible:outline-brand"
              : "border-white/10 bg-transparent text-white/30 hover:border-white/20 hover:text-white/50 focus-visible:outline-brand"
            : explicitLang
              ? "border-black/15 bg-white text-black hover:border-black/30 focus-visible:outline-brand dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:border-white/35 dark:focus-visible:outline-brand"
              : "border-black/8 bg-transparent text-black/35 hover:border-black/20 hover:text-black/60 focus-visible:outline-black/20 dark:border-white/10 dark:text-white/30 dark:hover:border-white/20 dark:hover:text-white/50"
        }`}
      >
        <Select.Value>
          {(value) => value ? (value as string).toUpperCase() : <span className="normal-case tracking-normal">—</span>}
        </Select.Value>
        <Select.Icon>
          <CaretUpDownIcon
            size={14}
            weight="bold"
            className={isDark ? "text-white/50" : "text-black/40 dark:text-white/50"}
            aria-hidden="true"
          />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner side="bottom" align="center" sideOffset={4} className="z-50">
          <Select.Popup className="rounded-lg border border-black/10 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-ink origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            {LANGUAGES.map((lang) => (
              <Select.Item
                key={lang.code}
                value={lang.code}
                className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-black/60 select-none data-[highlighted]:bg-brand/10 data-[highlighted]:text-black dark:text-white/70 dark:data-[highlighted]:bg-brand/20 dark:data-[highlighted]:text-white outline-none"
              >
                <Select.ItemIndicator className="col-start-1">
                  <CheckIcon size={14} weight="bold" aria-hidden="true" />
                </Select.ItemIndicator>
                <Select.ItemText className="col-start-2">
                  {lang.label}
                  <span className="ml-1.5 uppercase text-black/30 dark:text-white/40">
                    {lang.code}
                  </span>
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
};
