import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthProvider"; // 👈 Import the provider
import { AuthPage } from "./features/auth/pages/AuthPage";

const HomePage = () => {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-green-600">
        Welcome to the Chat App!
        <button
          onClick={logout}
          className="mt-4 bg-red-500 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </h1>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

const AuthRedirector = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

function App() {
  return (
    // 👇 Wrap your application with the AuthProvider
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
