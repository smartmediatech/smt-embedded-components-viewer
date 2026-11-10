import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "../types/auth.types";
import { authService } from "../services/authService";
import { confirmCode, requestCode } from "../services/authService/userApi";
import { fromAnswer, startGoogle, startSmt } from "../services/authService/redirectSignIn";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Emails a one-time code; a sign-up also records consent (see userApi). */
  requestEmailCode: (args: { email: string; signup: boolean }) => Promise<void>;
  confirmEmailCode: (args: { email: string; code: string }) => Promise<void>;
  /** Leaves for Google. A sign-up must have collected consent first. */
  signInWithGoogle: (args: { signup: boolean }) => Promise<void>;
  /** Leaves for the SMT login. */
  signInWithSmt: () => Promise<void>;
  logout: () => Promise<void>;
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

  const requestEmailCode = async ({ email, signup }: { email: string; signup: boolean }) => {
    await requestCode(email, signup);
  };

  const confirmEmailCode = async ({ email, code }: { email: string; code: string }) => {
    const session = fromAnswer(await confirmCode(email, code));
    setUser(await authService.startSession(session, email));
  };

  const signInWithGoogle = async ({ signup }: { signup: boolean }) => {
    startGoogle(signup);
  };

  const signInWithSmt = () => startSmt();

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    requestEmailCode,
    confirmEmailCode,
    signInWithGoogle,
    signInWithSmt,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
