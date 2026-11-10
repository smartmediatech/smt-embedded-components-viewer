/** A log-in found no account for that email or Google user. */
export class AccountNotFoundError extends Error {
  constructor() {
    super("No account found. Sign up to create one.");
    this.name = "AccountNotFoundError";
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
