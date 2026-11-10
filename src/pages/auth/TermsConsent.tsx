import { useId } from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import { Dialog } from "@base-ui/react/dialog";
import { CheckIcon } from "@phosphor-icons/react";

const TERMS_URL = "https://www.smartmediatech.io/legal/en/terms";
const PRIVACY_URL = "https://www.smartmediatech.io/legal/en/privacy-policy";

const linkCls =
  "text-blue-400 underline underline-offset-2 hover:text-blue-300 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 rounded-sm";

/** The consent wording from the signup task, word for word. */
export const TermsText = () => (
  <>
    By checking this box, I confirm I am 18 years of age or older, have read and agree to the{" "}
    <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
      Consolidated Terms
    </a>
    ,{" "}
    <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
      Privacy Policy
    </a>
    , and wish to be enrolled in the My Rewards Program which constitutes my full and
    unconditional agreement to the Terms and Conditions available{" "}
    <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
      here
    </a>
  </>
);

interface TermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Shown under the box after a submit attempt without consent. */
  error?: string;
}

/**
 * The consent checkbox with the terms beside it. The text is the label, so a
 * click on it ticks the box, except on the links, which open the documents.
 */
export const TermsCheckbox = ({ checked, onCheckedChange, disabled, error }: TermsCheckboxProps) => {
  const labelId = useId();
  const errorId = useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <Checkbox.Root
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-labelledby={labelId}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 flex size-[18px] flex-none items-center justify-center rounded border border-[#5A5A5A]
            bg-[#1A1A1A] transition-colors data-[checked]:border-blue-600 data-[checked]:bg-blue-600
            data-[disabled]:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-blue-400 cursor-pointer"
        >
          <Checkbox.Indicator className="text-white">
            <CheckIcon size={12} weight="bold" aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Root>
        {/* A span, not a <label>: Base UI's checkbox is a span[role=checkbox]. */}
        <span
          id={labelId}
          className="text-[13px] leading-normal text-[#B3B3B3] cursor-pointer"
          onClick={(e) => {
            if (disabled || (e.target as HTMLElement).closest("a")) return;
            onCheckedChange(!checked);
          }}
        >
          <TermsText />
        </span>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-400 pl-[30px]">
          {error}
        </p>
      )}
    </div>
  );
};

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the box is ticked and the user continues. */
  onContinue: () => void;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * Shown before a social sign-up continues (as on the claim page): the user
 * agrees to the terms first, then the provider's own sign-in opens.
 */
export const TermsDialog = ({ open, onOpenChange, onContinue, checked, onCheckedChange }: TermsDialogProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
      <Dialog.Popup
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2
          rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6 text-white shadow-xl
          flex flex-col gap-5 font-[Manrope,system-ui,sans-serif]"
      >
        <Dialog.Title className="m-0 font-[Archivo,sans-serif] text-xl font-extrabold uppercase">
          Before you continue
        </Dialog.Title>
        <Dialog.Description className="m-0 text-sm text-[#B3B3B3]">
          Please agree to the terms to create your account.
        </Dialog.Description>
        <TermsCheckbox checked={checked} onCheckedChange={onCheckedChange} />
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={!checked}
            onClick={onContinue}
            className="h-[52px] rounded-xl bg-blue-600 font-bold text-white transition hover:brightness-110
              disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-blue-400 cursor-pointer"
          >
            Continue
          </button>
          <Dialog.Close
            className="self-center text-sm font-semibold text-[#B3B3B3] underline underline-offset-[3px]
              hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-blue-400 rounded-sm cursor-pointer"
          >
            Cancel
          </Dialog.Close>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
);
