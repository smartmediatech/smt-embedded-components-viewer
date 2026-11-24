import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "../types/auth.types";
import { authService } from "../services/authService";
import { confirmCode, requestCode } from "../services/authService/userApi";
import { fromAnswer, startGoogle, startSmt, type FinishedSession } from "../services/authService/redirectSignIn";
import { StaleSessionError } from "../services/authService/errors";
import { getActiveTenantKey } from "../config/viewerConfig";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Emails a one-time code; a sign-up also records consent (see userApi). */
  requestEmailCode: (args: { email: string; signup: boolean }) => Promise<void>;
  confirmEmailCode: (args: { email: string; code: string }) => Promise<void>;
  /** Email and password (`/v1/user/login`); log in only. */
  signInWithPassword: (args: { email: string; password: string }) => Promise<void>;
  /** Leaves for Google. A sign-up must have collected consent first. */
  signInWithGoogle: (args: { signup: boolean }) => Promise<void>;
  /** Leaves for the SMT login. */
  signInWithSmt: () => Promise<void>;
  logout: () => Promise<void>;
  /** Re-reads the user, e.g. after an embedded profile changed the name or avatar. */
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Check if user is already logged in and fetch from API
    const fetchUser = async () => {
      try {
        const currentUser = await authService.fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        // A newer sign-in replaced the session meanwhile: leave it alone.
        if (error instanceof StaleSessionError) return;
        // If fetch fails, logout the user
        console.error("Failed to fetch current user, logging out:", error);
        authService.clearSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (authService.isAuthenticated()) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // A session that ends behind our back (expired, or cleared by a component)
  // signs the user out here too, so the routes send them to /login.
  useEffect(() => authService.onSessionEnd(() => setUser(null)), []);

  /**
   * Installs a finished sign-in, unless the publisher changed while it ran:
   * the session would then be signed for the wrong app id. Checked again once
   * the user has loaded, since the picker stays usable while it loads.
   */
  const startSessionFor = async (startedOn: string, session: FinishedSession, email: string) => {
    const publisherChanged = () => getActiveTenantKey() !== startedOn;
    const changedError = () => new Error("The publisher changed while signing in. Please try again.");
    if (publisherChanged()) throw changedError();
    let signedIn: User;
    try {
      signedIn = await authService.startSession(session, email);
    } catch (error) {
      // Logging out on a publisher change ends the session we were loading.
      if (error instanceof StaleSessionError && publisherChanged()) throw changedError();
      throw error;
    }
    if (publisherChanged()) {
      // Still this sign-in's session (startSession would have thrown otherwise).
      authService.clearSession();
      throw changedError();
    }
    setUser(signedIn);
  };

  const requestEmailCode = async ({ email, signup }: { email: string; signup: boolean }) => {
    await requestCode(email, signup);
  };

  const confirmEmailCode = async ({ email, code }: { email: string; code: string }) => {
    const startedOn = getActiveTenantKey();
    const session = fromAnswer(await confirmCode(email, code));
    await startSessionFor(startedOn, session, email);
  };

  const signInWithPassword = async ({ email, password }: { email: string; password: string }) => {
    const startedOn = getActiveTenantKey();
    const session = await authService.loginWithPassword(email, password);
    await startSessionFor(startedOn, session, email);
  };

  const signInWithGoogle = async ({ signup }: { signup: boolean }) => {
    startGoogle(signup);
  };

  const signInWithSmt = () => startSmt();

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    if (!authService.isAuthenticated()) return;
    try {
      setUser(await authService.fetchCurrentUser());
    } catch (error) {
      // Keep showing what we had; a failed refresh isn't a reason to log out.
      console.error("Failed to refresh current user:", error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    requestEmailCode,
    confirmEmailCode,
    signInWithPassword,
    signInWithGoogle,
    signInWithSmt,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
