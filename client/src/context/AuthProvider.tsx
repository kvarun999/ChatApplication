// src/context/AuthProvider.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
} from "react";

// Define the shape of the context's value
interface AuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// Create the context with an initial undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    // Initialize state from localStorage to keep the user logged in
    return localStorage.getItem("accessToken");
  });

  const login = (token: string) => {
    setAccessToken(token);
    localStorage.setItem("accessToken", token);
  };

  const logout = () => {
    setAccessToken(null);
    localStorage.removeItem("accessToken");
    // We will later call the backend's /logout endpoint here
  };

  // Use useMemo to prevent re-creating the context value on every render
  const authContextValue = useMemo(
    () => ({
      accessToken,
      isAuthenticated: !!accessToken,
      login,
      logout,
    }),
    [accessToken]
  );

  //console.log(authContextValue);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
