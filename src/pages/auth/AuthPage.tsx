import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { OTPField } from "@base-ui/react/otp-field";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { getViewerConfig } from "../../config/viewerConfig";
import { takeRedirectResult } from "../../services/authService/redirectSignIn";
import { TenantSelect } from "../../components/TenantSelect";
import { EmailIcon, GoogleIcon, SmtMark } from "./icons";
import { TermsCheckbox, TermsDialog } from "./TermsConsent";

export type AuthMode = "login" | "signup";
type Step = "choose" | "email" | "code";

const CODE_LENGTH = 6;

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to your SMT account to continue.",
    lead: "Sign in to earn, track and redeem your rewards points.",
    google: "Continue with Google",
    email: "Continue with Email",
    submit: "Continue",
    back: "← Other sign-in options",
  },
  signup: {
    title: "Create your account",
    subtitle: "Join in seconds and start earning rewards.",
    lead: "Create an account to start earning, tracking and redeeming your rewards points.",
    google: "Sign up with Google",
    email: "Sign up with Email",
    submit: "Create account",
    back: "← Other sign-up options",
  },
} as const;

const optionBtnCls =
  "h-[52px] w-full rounded-xl border border-[#333] bg-[#1C1C1C] text-white font-semibold text-base " +
  "flex items-center justify-center gap-3 transition-colors hover:bg-[#262626] hover:border-[#4A4A4A] " +
  "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400";

const primaryBtnCls =
  "h-[52px] w-full rounded-xl bg-blue-600 text-white font-bold text-base transition hover:brightness-110 " +
  "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400";

const linkBtnCls =
  "self-center text-sm font-semibold text-[#B3B3B3] underline underline-offset-[3px] hover:text-white " +
  "cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400";

const fieldCls =
  "h-[50px] w-full rounded-xl border border-[#3A3A3A] bg-[#1A1A1A] px-4 text-base font-medium text-white " +
  "placeholder:text-[#8C8C8C] outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/20 " +
  "disabled:opacity-50 aria-[invalid=true]:border-red-500";

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

/**
 * Log in and sign up for the embed demo, after the "SMT Sign-in & Sign-up"
 * design. Three ways in:
 *
 * - Email: a one-time code, as on the claim page. On sign-up the terms box
 *   sits under the email field, above the submit button.
 * - Google: on sign-up the terms open in a dialog first, then Google's
 *   sign-in continues.
 * - SMT: OpenID Connect against the SMT login (log in only).
 *
 * Logging in with an email or Google account that doesn't exist yet moves to
 * sign-up with the email kept, so the user only has to agree to the terms.
 */
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Manrope:wght@400;500;600;700&display=swap";

/**
 * The design's fonts, loaded only when a sign-in page opens: the component
 * pages don't use them, and shouldn't make a request to Google for them.
 */
function useAuthFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_URL}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_URL;
    document.head.appendChild(link);
  }, []);
}

export const AuthPage = ({ mode }: { mode: AuthMode }) => {
  useAuthFonts();
  const navigate = useNavigate();
  const { user, requestEmailCode, confirmEmailCode, signInWithGoogle, signInWithSmt } = useAuth();

  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const copy = COPY[mode];
  const isSignup = mode === "signup";

  // What a redirect from the log-in page carried over: the email, a message,
  // or "continue the Google sign-up". Read once, then dropped so a reload
  // starts clean.
  const location = useLocation();
  useEffect(() => {
    const carried = location.state as RedirectState | null;
    if (!carried) return;
    if (carried.email) {
      setEmail(carried.email);
      setStep("email");
    }
    if (carried.notice) setNotice(carried.notice);
    if (carried.google) setTermsOpen(true);
    navigate(".", { replace: true, state: null });
  }, [location.state, navigate]);

  // How a Google or SMT sign-in that left the page ended (see index.tsx).
  useEffect(() => {
    const result = takeRedirectResult();
    if (!result) return;
    if (result.status === "error") {
      setError(result.message);
    } else if (isSignup) {
      setError("Google sign-up didn't finish. Please try again.");
    } else {
      // As on the claim page: a new Google user gets the terms, then Google again.
      navigate("/signup", {
        state: { google: true, notice: "No account yet for that Google account. Agree to the terms to create one." },
      });
    }
  }, [isSignup, navigate]);

  // Read from the tenant in AppContext, so the methods follow the picker below.
  const { tenant } = useApp();
  const tenantConfig = getViewerConfig().tenants[tenant];
  const emailAvailable = !!tenantConfig?.signup;
  const googleAvailable = !!tenantConfig?.signup?.googleClientId;
  const smtAvailable = !isSignup && !!tenantConfig?.oidc;

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    setNotice("");
    if (isSignup && !consent) {
      setConsentError("Please agree to the terms to continue.");
      return;
    }
    setConsentError("");
    const address = email.trim();
    void run(async () => {
      await requestEmailCode({ email: address, signup: isSignup });
      setCode("");
      setStep("code");
    }, "Could not send the code. Please try again.");
  };

  const verifyCode = (value: string) => {
    void run(async () => {
      try {
        await confirmEmailCode({ email: email.trim(), code: value });
      } catch (err) {
        setCode("");
        throw err;
      }
      navigate("/");
    }, "That code didn't work. Please try again.");
  };

  const google = () => {
    if (isSignup && !consent) {
      setTermsOpen(true);
      return;
    }
    setTermsOpen(false);
    // Leaves the page; the sign-in finishes when Google sends the user back.
    void run(() => signInWithGoogle({ signup: isSignup }), "Google sign-in failed. Please try again.");
  };

  const smt = () => void run(() => signInWithSmt(), "Could not start the SMT sign-in.");

  if (user) return <Navigate to="/" replace />;

  return (
    <Shell lead={copy.lead}>
      <div className="flex flex-col gap-2.5">
        <h2 className="m-0 font-[Archivo,sans-serif] text-[32px] font-extrabold uppercase leading-tight tracking-[-.005em] text-white">
          {step === "code" ? "Check your email" : copy.title}
        </h2>
        <p className="m-0 text-base text-[#B3B3B3]">
          {step === "code" ? (
            <>
              We sent a {CODE_LENGTH}-digit code to <span className="font-semibold text-white">{email.trim()}</span>.
            </>
          ) : (
            copy.subtitle
          )}
        </p>
      </div>

      {notice && (
        <p role="status" className="m-0 rounded-xl border border-blue-600/40 bg-blue-600/10 px-4 py-3 text-sm text-blue-100">
          {notice}
        </p>
      )}

      {step === "choose" && (
        <div className="flex flex-col gap-3">
          {googleAvailable && (
            <button type="button" className={optionBtnCls} onClick={google} disabled={busy}>
              <GoogleIcon />
              {copy.google}
            </button>
          )}
          {smtAvailable && (
            <button type="button" className={optionBtnCls} onClick={smt} disabled={busy}>
              <SmtMark />
              Continue with SMT
            </button>
          )}
          {emailAvailable && (
            <button type="button" className={optionBtnCls} onClick={() => setStep("email")} disabled={busy}>
              <EmailIcon />
              {copy.email}
            </button>
          )}
          {!googleAvailable && !smtAvailable && !emailAvailable && (
            <p className="m-0 text-sm text-[#B3B3B3]">
              {isSignup ? "Sign-up" : "Sign-in"} {"isn't"} set up for this publisher. Add <code>signup</code> or{" "}
              <code>oidc</code> to its tenant in <code>config.json</code>.
            </p>
          )}
        </div>
      )}

      {step === "email" && (
        <form className="flex flex-col gap-4" onSubmit={sendCode} noValidate={false}>
          <div className="flex flex-col gap-2">
            <label htmlFor="auth-email" className="text-sm font-semibold text-white">
              Email
            </label>
            <input
              id="auth-email"
              className={fieldCls}
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com"
              required
              autoFocus
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {isSignup && (
            <TermsCheckbox
              checked={consent}
              onCheckedChange={(v) => {
                setConsent(v);
                if (v) setConsentError("");
              }}
              disabled={busy}
              error={consentError}
            />
          )}
          <button type="submit" className={`${primaryBtnCls} mt-2`} disabled={busy}>
            {busy ? "Sending code…" : copy.submit}
          </button>
          <button type="button" className={linkBtnCls} onClick={() => setStep("choose")} disabled={busy}>
            {copy.back}
          </button>
        </form>
      )}

      {step === "code" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === CODE_LENGTH) verifyCode(code);
          }}
        >
          <span id="auth-code-label" className="text-sm font-semibold text-white">
            Code
          </span>
          <OTPField.Root
            length={CODE_LENGTH}
            value={code}
            onValueChange={setCode}
            onValueComplete={verifyCode}
            disabled={busy}
            aria-labelledby="auth-code-label"
            className="flex gap-2"
          >
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <OTPField.Input
                key={i}
                aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                className={`${fieldCls} !w-12 !px-0 text-center text-xl`}
              />
            ))}
          </OTPField.Root>
          <button type="submit" className={`${primaryBtnCls} mt-2`} disabled={busy || code.length !== CODE_LENGTH}>
            {busy ? "Checking…" : "Verify"}
          </button>
          <div className="flex justify-center gap-6">
            <button
              type="button"
              className={linkBtnCls}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await requestEmailCode({ email: email.trim(), signup: isSignup });
                  setNotice("We sent a new code.");
                }, "Could not resend the code.")
              }
            >
              Resend code
            </button>
            <button type="button" className={linkBtnCls} disabled={busy} onClick={() => setStep("email")}>
              Use a different email
            </button>
          </div>
          {!isSignup && (
            <p className="m-0 text-center text-[13px] text-[#8C8C8C]">
              No code? We only send one if the email has an account.{" "}
              <Link to="/signup" state={{ email: email.trim() }} className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
                Sign up instead
              </Link>
            </p>
          )}
        </form>
      )}

      {error && (
        <p role="alert" className="m-0 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="h-px bg-[#2A2A2A]" />

      <p className="m-0 text-center text-[15px] text-[#B3B3B3]">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <Link
          to={isSignup ? "/login" : "/signup"}
          className="font-bold text-blue-400 underline underline-offset-[3px] hover:text-blue-300 rounded-sm
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          {isSignup ? "Log In" : "Sign Up"}
        </Link>
      </p>

      <TermsDialog
        open={termsOpen}
        onOpenChange={setTermsOpen}
        checked={consent}
        onCheckedChange={setConsent}
        onContinue={google}
      />
    </Shell>
  );
};

/** Router state a log-in that found no account passes on to the sign-up page. */
type RedirectState = { email?: string; notice?: string; google?: boolean };

/** The two-panel frame: brand on the left (hidden on narrow screens), the form on the right. */
const Shell = ({ lead, children }: { lead: string; children: ReactNode }) => (
  <div className="min-h-screen flex flex-wrap bg-[#111] text-[#B3B3B3] font-[Manrope,system-ui,sans-serif]">
    <section className="hidden md:flex flex-[1_1_520px] min-w-0 flex-col justify-between gap-12 border-r border-[#262626] px-[clamp(24px,5vw,72px)] py-12 text-white">
      <span className="font-[Archivo,sans-serif] text-[28px] font-extrabold tracking-tight">SMT</span>
      <div className="flex max-w-[560px] flex-col gap-6">
        <h1 className="m-0 font-[Archivo,sans-serif] text-[clamp(40px,5vw,64px)] font-extrabold uppercase leading-[1.02] tracking-[-.01em]">
          My Rewards
        </h1>
        <div aria-hidden="true" className="h-1 w-16 rounded-sm bg-[#C11001]" />
        <p className="m-0 text-lg leading-relaxed text-[#B3B3B3]">{lead}</p>
      </div>
      <p className="m-0 text-[13px] text-[#8C8C8C]">© {new Date().getFullYear()} SmartMedia Technologies Limited. All rights reserved.</p>
    </section>

    <main className="flex flex-[1_1_440px] min-w-0 items-center justify-center px-4 py-12 sm:px-6">
      <div className="flex w-full max-w-[400px] flex-col gap-7">
        <span className="md:hidden font-[Archivo,sans-serif] text-[28px] font-extrabold tracking-tight text-white">SMT</span>
        {children}
        {/*
          The tenant has to be picked before signing in: it selects the app id
          the login is signed with, which must match the publisher config the
          components load. A demo-tool control, so it sits below the design.
        */}
        <details className="text-sm text-[#8C8C8C]">
          <summary className="cursor-pointer select-none rounded-sm focus-visible:outline-2 focus-visible:outline-blue-400">
            Environment / publisher
          </summary>
          <div className="mt-3 flex flex-col gap-1.5">
            <TenantSelect />
            <span className="text-xs">Selects the fqdn and the matching app id</span>
          </div>
        </details>
      </div>
    </main>
  </div>
);
