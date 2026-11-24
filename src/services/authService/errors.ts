/** A log-in found no account for that email or Google user. */
export class AccountNotFoundError extends Error {
  constructor() {
    super("No account found. Sign up to create one.");
    this.name = "AccountNotFoundError";
  }
}

/**
 * The session is over for good: no refresh token behind an expired access
 * token (SMT login), or the refresh token expired or was rejected. Unlike a
 * network error while refreshing, signing in again is the only way on.
 */
export class SessionEndedError extends Error {
  constructor(message = "The session has ended. Please login again.") {
    super(message);
    this.name = "SessionEndedError";
  }
}

/** An error answer from the SMT user API: HTTP 500, `{ status: "error", error: <code>, message }`. */
export class UserApiError extends Error {
  constructor(
    readonly code: number | string,
    message: string,
  ) {
    super(message);
    this.name = "UserApiError";
  }
}

/**
 * The session was replaced or cleared while a call for it ran (a newer
 * sign-in, a logout, a publisher change): its answer must be dropped, and the
 * newer session left alone.
 */
export class StaleSessionError extends Error {
  constructor(message = "The sign-in was interrupted. Please try again.") {
    super(message);
    this.name = "StaleSessionError";
  }
}
