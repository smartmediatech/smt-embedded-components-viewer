import { getActiveTenant, type SignupConfig } from "../../config/viewerConfig";
import { AccountNotFoundError, UserApiError } from "./errors";

/**
 * The SMT user API (the "user lambda"): the same `/login`, `/signup`,
 * `/confirm` and `/connect` calls the claim page makes through vlabs-user.js,
 * made directly.
 *
 * It finds the publisher from `X-Api-Key`, signs the platform calls with that
 * publisher's app id itself, and answers a finished sign-in with
 * `session.viewer_refresh`: a platform refresh token, which the viewer uses
 * like the one from `/v1/user/login`.
 */

/** User API error codes the page reacts to (user lambda `index.js`). */
const ERROR = {
  /** Google: no account, and no campaign to create one with. */
  noAccount: 150,
  /** A Google account that was never confirmed. */
  notVerified: 162,
  /** The publisher has a WAF tier and the request didn't come through it. */
  forbidden: 98,
  /** Wrong or unknown `X-Api-Key`. */
  unauthorized: 99,
} as const;

const MESSAGES: Record<number, string> = {
  [ERROR.notVerified]: "This account hasn't been verified yet.",
  [ERROR.forbidden]: "The sign-in service refused this site (WAF). Ask SMT to allow the demo origin.",
  [ERROR.unauthorized]: "The sign-in service doesn't know this publisher. Check signup.apiKey in config.json.",
};

export interface SignInAnswer {
  user_id?: string;
  /** Present when the code was right but there is no account (log-in only). */
  notification_prompt?: boolean;
  new?: number | boolean;
  session?: { viewer_refresh?: string };
}

export function getSignupConfig(): SignupConfig | null {
  return getActiveTenant().signup ?? null;
}

function requireSignupConfig(): SignupConfig {
  const config = getSignupConfig();
  if (!config) throw new Error("Email and Google sign-in aren't set up for this publisher.");
  return config;
}

function apiKey(config: SignupConfig): string {
  if (config.apiKey) return config.apiKey;
  const fqdn = getActiveTenant().fqdn;
  if (!fqdn) throw new Error("The tenant has no fqdn to build the user API key from; set signup.apiKey.");
  return btoa(fqdn);
}

async function call(action: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const config = requireSignupConfig();
  let response: Response;
  try {
    response = await fetch(`${config.userApiUrl.replace(/\/$/, "")}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "X-Api-Key": apiKey(config),
      },
      body: JSON.stringify({ version: config.version, ...body }),
    });
  } catch {
    throw new Error("Couldn't reach the sign-in service. Check your connection and try again.");
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || data.status === "error") {
    const code = (data.error_code ?? data.error ?? response.status) as number | string;
    if (Number(code) === ERROR.noAccount) throw new AccountNotFoundError();
    const message =
      MESSAGES[Number(code)] ??
      (typeof data.message === "string" && data.message) ??
      "Something went wrong. Please try again.";
    throw new UserApiError(code, `${message} (${code})`);
  }
  return data;
}

/** What a sign-up sends so the user API records consent to the campaign's terms. */
function consentFields(config: SignupConfig) {
  return {
    language: config.language ?? "en",
    ...(config.campaign ? { campaign: config.campaign } : {}),
    policies_accepted: config.policies ?? {},
  };
}

/**
 * Emails a one-time code.
 *
 * Sign-up goes through `/signup`, which creates the account when there is
 * none (recording consent) and sends the code either way, as on the claim
 * page. Log-in goes through `/login`, which never says whether the email has
 * an account: for an unknown email it answers the same, but sends nothing.
 */
export async function requestCode(email: string, signup: boolean): Promise<void> {
  const config = requireSignupConfig();
  await call(signup ? "signup" : "login", signup ? { user: email, ...consentFields(config) } : { user: email });
}

/** Checks the emailed code. The user API takes the code as `password`. */
export async function confirmCode(email: string, code: string): Promise<SignInAnswer> {
  return (await call("confirm", { user: email, password: code })) as SignInAnswer;
}

/**
 * Finishes a Google sign-in with the code Google sent back.
 *
 * With `signup`, the campaign and consent go along and the user API creates
 * the account if needed. Without it, a Google user with no account fails with
 * {@link AccountNotFoundError}.
 */
export async function connectGoogle(code: string, state: string, signup: boolean): Promise<SignInAnswer> {
  const config = requireSignupConfig();
  return (await call("connect", {
    connect: "google",
    connection: { code, state, app: config.googleClientId },
    ...(signup ? consentFields(config) : { language: config.language ?? "en" }),
  })) as SignInAnswer;
}
