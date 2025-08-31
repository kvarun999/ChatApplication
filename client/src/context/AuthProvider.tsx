import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
} from "react";
import { User } from "../types/user.types";
import { getMe } from "../services/user.service";

interface AuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean; // To handle initial load state
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("accessToken")
  );
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading on init

  // Effect to check for existing token and fetch user on app start
  useEffect(() => {
    const initializeAuth = async () => {
      if (accessToken) {
        try {
          // Use the request interceptor in axios.ts to add the token
          const userData = await getMe();
          setUser(userData);
        } catch (error) {
          // Token is invalid or expired, clear it
          console.error("Session expired, logging out.");
          setAccessToken(null);
          setUser(null);
          localStorage.removeItem("accessToken");
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []); // Run only once on app mount

  const login = async (token: string) => {
    // Set token immediately for the interceptor to use
    localStorage.setItem("accessToken", token);
    setAccessToken(token);

    // After setting the token, fetch the user data
    try {
      const userData = await getMe();
      setUser(userData);
    } catch (error) {
      console.error("Failed to fetch user after login", error);
      // If user fetch fails, logout to clear the bad state
      logout();
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    // In a real app, you might also call the /api/auth/logout endpoint
  };

  const authContextValue = useMemo(
    () => ({
      accessToken,
      isAuthenticated: !!accessToken && !!user,
      user,
      isLoading,
      login,
      logout,
    }),
    [accessToken, user, isLoading]
  );

  // Render a loading state while we verify the token on app load
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        Loading session...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook remains the same
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
