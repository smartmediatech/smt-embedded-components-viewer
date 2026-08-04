import {
  LoginCredentials,
  AuthResponse,
  User,
  ApiLoginPayload,
  ApiLoginResponse,
  ApiGetUserResponse,
} from "../../types/auth.types";
import checkJwtToken from "./checkJwtExpiration";
import { getActiveAppId, getViewerConfig } from "../../config/viewerConfig";

/**
 * Backend and app id come from the runtime config so no customer identifier
 * lives in this repo's source. Read lazily (per call, not at module scope) —
 * the config resolves before the first render, but module evaluation can
 * happen earlier.
 */
const apiBaseUrl = () => getViewerConfig().auth.apiBaseUrl;
// Per-tenant: the id must match the publisher config the components load.
const appId = () => getActiveAppId();

// Authentication service
class AuthService {
  private ACCESS_TOKEN: string | null = null;
  private readonly REFRESH_TOKEN_KEY = "refresh_token";
  private readonly USER_KEY = "auth_user";
  private refreshPromise: Promise<string> | null = null;

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const payload: ApiLoginPayload = {
      token: credentials.email,
      token_type: "email",
      auth_data: {
        password: credentials.password,
      },
    };

    try {
      const response = await fetch(`${apiBaseUrl()}/v1/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "App-Id": appId(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || "Authentication failed");
        } catch (parseError) {
          if (
            parseError instanceof Error &&
            parseError.message !== "Authentication failed"
          ) {
            throw new Error("Invalid email or password");
          }
          throw parseError;
        }
      }

      const data: ApiLoginResponse = await response.json();

      // Transform API response to our User type
      const user: User = {
        id: data.payload.user.id,
        email: credentials.email,
        name:
          `${data.payload.user.properties.first_name || ""} ${data.payload.user.properties.last_name || ""}`.trim() ||
          "User",
        firstName: data.payload.user.properties.first_name,
        lastName: data.payload.user.properties.last_name,
        avatarUri: data.payload.user.properties.avatar_uri,
      };

      const token = data.payload.access_token.token;
      const refreshToken = data.payload.refresh_token.token;

      // Store refresh token and user in localStorage; keep access token in memory
      this.ACCESS_TOKEN = token;
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));

      return { user, token, refreshToken };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Login failed. Please try again.");
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate tokens on server
      await this.smtFetch(`${apiBaseUrl()}/v1/user/logout`, {
        method: "POST",
      });
    } catch (error) {
      // Continue with local logout even if API call fails
      console.error("Logout API call failed:", error);
    } finally {
      // Clear local storage and tokens
      this.clearSession();
    }
  }

  clearSession(): void {
    // Clear local storage and tokens
    this.ACCESS_TOKEN = null;
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.ACCESS_TOKEN;
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const refresh = this.getRefreshToken();
    // Make sure remaining user session is at least 5 min
    const isValid = checkJwtToken(refresh, 5 * 60 * 1000);
    return isValid;
  }

  async refreshAccessToken(): Promise<string> {
    // If there's already a refresh in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Create a new refresh promise
    this.refreshPromise = this.performRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      // Clear the promise after completion (success or failure)
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    // Check if refresh token has expired before making network request
    if (!checkJwtToken(refreshToken)) {
      throw new Error("Refresh token has expired");
    }

    try {
      const response = await fetch(`${apiBaseUrl()}/v1/access_token`, {
        method: "POST",
        headers: {
          "App-Id": appId(),
          Authorization: `Bearer ${refreshToken ?? ""}`,
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        // Unauthorized (invalid refresh token or app id mismatch)
        throw new Error(
          "Unauthorized: Invalid refresh token or app ID mismatch",
        );
      }

      if (!response.ok) {
        throw new Error("Failed to refresh access token");
      }

      const json: Record<string, any> = await response.json();
      const payload = json.payload as { access_token: { token: string } };
      const newAccessToken = payload.access_token.token;

      // Update stored access token
      this.ACCESS_TOKEN = newAccessToken;

      return newAccessToken;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to refresh access token");
    }
  }

  async getAccessToken(): Promise<string> {
    let accessToken = this.getToken();

    // Check if access token is valid
    if (!accessToken || !checkJwtToken(accessToken)) {
      // Access token is invalid or expired, refresh it
      try {
        accessToken = await this.refreshAccessToken();
      } catch {
        throw new Error("Failed to refresh access token. Please login again.");
      }
    }

    return accessToken;
  }

  async smtFetch(url: string, options?: RequestInit): Promise<Response> {
    const accessToken = await this.getAccessToken();

    // Merge headers with App-Id and Authorization
    const headers = {
      ...options?.headers,
      "App-Id": appId(),
      Authorization: `Bearer ${accessToken}`,
    };

    // Perform the fetch with the updated headers
    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  }

  async fetchCurrentUser(): Promise<User> {
    try {
      const response = await this.smtFetch(`${apiBaseUrl()}/v1/user`);

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      const data: ApiGetUserResponse = await response.json();

      // Get email from stored user or use empty string as fallback
      const storedUserStr = localStorage.getItem(this.USER_KEY);
      let email = "";
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          email = storedUser.email || "";
        } catch {
          // Ignore parse errors
        }
      }

      // Transform API response to our User type (same way as login)
      const user: User = {
        id: data.payload.id,
        email: email,
        name:
          `${data.payload.properties.first_name || ""} ${data.payload.properties.last_name || ""}`.trim() ||
          "User",
        firstName: data.payload.properties.first_name,
        lastName: data.payload.properties.last_name,
        avatarUri: data.payload.properties.avatar_uri,
      };

      // Update stored user
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));

      return user;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to fetch current user");
    }
  }
}

export const authService = new AuthService();
