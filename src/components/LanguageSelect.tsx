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

export const LanguageSelect = () => {
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
        className={`flex h-8 min-w-16 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer ${
          explicitLang
            ? "border-black/15 bg-black/5 text-black hover:bg-black/10 focus-visible:outline-black/30 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:focus-visible:outline-white/50"
            : "border-black/8 bg-transparent text-black/35 hover:bg-black/5 hover:text-black/60 focus-visible:outline-black/20 dark:border-white/10 dark:text-white/30 dark:hover:bg-white/5 dark:hover:text-white/50"
        }`}
      >
        <Select.Value>
          {(value) => value ? (value as string).toUpperCase() : <span className="normal-case tracking-normal">—</span>}
        </Select.Value>
        <Select.Icon>
          <CaretUpDownIcon size={14} weight="bold" className="text-black/40 dark:text-white/50" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner side="bottom" align="center" sideOffset={4} className="z-50">
          <Select.Popup className="rounded-xl border border-black/10 bg-white/95 p-1 shadow-2xl shadow-black/10 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 dark:shadow-black/40 origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            {LANGUAGES.map((lang) => (
              <Select.Item
                key={lang.code}
                value={lang.code}
                className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-black/60 select-none data-[highlighted]:bg-black/5 data-[highlighted]:text-black dark:text-white/70 dark:data-[highlighted]:bg-white/10 dark:data-[highlighted]:text-white outline-none"
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
