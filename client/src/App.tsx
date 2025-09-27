import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthProvider";
import { SocketProvider } from "./context/SocketProvider";
import { AuthPage } from "./features/auth/pages/AuthPage";
import { ChatPage } from "./features/chat/pages/ChatPage";
import CryptoRoundtripTest from "./tests/CryptoRoundtripTest";
import { PresenceProvider } from "./context/PresenceProvider";

// ✅ Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

// ✅ Redirect if already logged in
const AuthRedirector = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SocketProvider>
                  <PresenceProvider>
                    <ChatPage />
                  </PresenceProvider>
                </SocketProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/auth"
            element={
              <AuthRedirector>
                <AuthPage />
              </AuthRedirector>
            }
          />
          {/* 🔹 Debug Route for crypto testing */}
          <Route path="/crypto-test" element={<CryptoRoundtripTest />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
