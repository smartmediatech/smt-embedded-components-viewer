import { jwtDecode } from "jwt-decode";
import {
  getActiveAppId,
  getActiveTenant,
  getActiveTenantKey,
  getRedirectUri,
  getViewerConfig,
  setActiveTenant,
} from "../../config/viewerConfig";
import { connectGoogle, getSignupConfig, type SignInAnswer } from "./userApi";
import { AccountNotFoundError } from "./errors";

/**
 * Sign-ins that leave the page: Google, and SMT over OpenID Connect.
 *
 * Before leaving, the page keeps what it needs to finish in sessionStorage
 * (the state, PKCE verifier and nonce, the tenant, whether it is a sign-up).
 * The provider sends the user back to the viewer's URL with `?code&state`,
 * and {@link finishRedirectSignIn} runs before the app renders.
 */

const PENDING_KEY = "auth_pending_redirect";
const RESULT_KEY = "auth_redirect_result";

type Pending =
  | { kind: "google"; state: string; tenant: string; signup: boolean }
  | { kind: "smt"; state: string; tenant: string; verifier: string; nonce: string };

/** How a redirect sign-in ended, for the sign-in page to show. */
export type RedirectResult =
  | { status: "account-not-found"; provider: "google" }
  | { status: "error"; message: string };

export type FinishedSession =
  | { kind: "refresh"; refreshToken: string }
  | { kind: "access"; accessToken: string; expiresIn: number; refreshToken?: string };

function randomString(bytes = 32): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return base64Url(data);
}

function base64Url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function savePending(pending: Pending): void {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

function takePending(): Pending | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  try {
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

/** The result of the last redirect sign-in, once. */
export function takeRedirectResult(): RedirectResult | null {
  const raw = sessionStorage.getItem(RESULT_KEY);
  sessionStorage.removeItem(RESULT_KEY);
  try {
    return raw ? (JSON.parse(raw) as RedirectResult) : null;
  } catch {
    return null;
  }
}

function saveResult(result: RedirectResult): void {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function isGoogleAvailable(): boolean {
  return !!getSignupConfig()?.googleClientId;
}

export function isSmtAvailable(): boolean {
  return !!getActiveTenant().oidc;
}

/** Leaves for Google's sign-in. A sign-up has already collected consent. */
export function startGoogle(signup: boolean): void {
  const clientId = getSignupConfig()?.googleClientId;
  if (!clientId) throw new Error("Google sign-in isn't set up for this publisher.");
  const state = `google,${randomString(16)}`;
  savePending({ kind: "google", state, tenant: getActiveTenantKey(), signup });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  window.location.assign(url.toString());
}

/** Leaves for the SMT login (authorization code flow with PKCE). */
export async function startSmt(): Promise<void> {
  const oidc = getActiveTenant().oidc;
  if (!oidc) throw new Error("SMT sign-in isn't set up for this publisher.");
  const state = randomString(16);
  const nonce = randomString(16);
  const verifier = randomString(32); // 43 characters, as the IdP requires
  savePending({ kind: "smt", state, nonce, verifier, tenant: getActiveTenantKey() });

  const url = new URL(`${oidc.issuer.replace(/\/$/, "")}/authorize`);
  url.search = new URLSearchParams({
    client_id: oidc.clientId ?? getActiveAppId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: oidc.scope ?? "openid profile email",
    state,
    nonce,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
  }).toString();
  window.location.assign(url.toString());
}

/**
 * Finishes a Google or SMT sign-in when the page loads with `?code&state` (or
 * `?error`). Runs before the app renders; takes the parameters out of the
 * address bar either way. Returns the session to start, or null; a failure is
 * kept for the sign-in page ({@link takeRedirectResult}).
 */
export async function finishRedirectSignIn(): Promise<FinishedSession | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const providerError = params.get("error");
  if (!state || (!code && !providerError)) return null;

  // Codes work once: never leave them in the address bar or history.
  window.history.replaceState(null, "", window.location.pathname + "#/login");

  const pending = takePending();
  if (!pending || pending.state !== state) {
    saveResult({ status: "error", message: "The sign-in expired or was started in another tab. Please try again." });
    return null;
  }
  if (pending.tenant in getViewerConfig().tenants) setActiveTenant(pending.tenant);

  if (providerError) {
    const cancelled = providerError === "access_denied";
    if (!cancelled) saveResult({ status: "error", message: `Sign-in failed (${providerError}).` });
    return null;
  }

  try {
    return pending.kind === "google"
      ? fromAnswer(await connectGoogle(code!, state, pending.signup))
      : await exchangeSmtCode(code!, pending);
  } catch (err) {
    if (err instanceof AccountNotFoundError) {
      saveResult({ status: "account-not-found", provider: "google" });
    } else {
      saveResult({ status: "error", message: err instanceof Error ? err.message : "Sign-in failed." });
    }
    return null;
  }
}

/** The platform refresh token from a user API sign-in answer. */
export function fromAnswer(answer: SignInAnswer): FinishedSession {
  const refreshToken = answer.session?.viewer_refresh;
  if (!refreshToken) {
    if (answer.notification_prompt) throw new AccountNotFoundError();
    throw new Error("The sign-in service didn't return a session.");
  }
  return { kind: "refresh", refreshToken };
}

async function exchangeSmtCode(
  code: string,
  pending: Extract<Pending, { kind: "smt" }>,
): Promise<FinishedSession> {
  const oidc = getActiveTenant().oidc;
  if (!oidc) throw new Error("SMT sign-in isn't set up for this publisher.");

  let response: Response;
  try {
    response = await fetch(`${oidc.issuer.replace(/\/$/, "")}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri(),
        client_id: oidc.clientId ?? getActiveAppId(),
        code_verifier: pending.verifier,
      }),
    });
  } catch {
    throw new Error("Couldn't reach the SMT login to finish signing in.");
  }
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    id_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "The SMT login didn't return a session.");
  }

  // The id_token came straight from the token endpoint over TLS, so its
  // signature needn't be checked here (OIDC Core 3.1.3.7), but its nonce must
  // be the one this sign-in sent.
  if (data.id_token) {
    const { nonce } = jwtDecode<{ nonce?: string }>(data.id_token);
    if (nonce !== pending.nonce) throw new Error("The SMT login answer didn't match this sign-in.");
  }

  return {
    kind: "access",
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
    refreshToken: data.refresh_token,
  };
}
