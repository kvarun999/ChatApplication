import React, { useState } from "react";
import { RegistrationForm } from "../components/RegistrationForm";
import LoginForm from "../components/LoginForm";

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white shadow-md rounded-2xl p-8">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Secure Chat
        </h1>
        <p className="text-center text-gray-500 mb-8">
          {isLogin
            ? "Sign in to continue to your chats"
            : "Create an account to get started"}
        </p>

        {/* Forms */}
        {isLogin ? <LoginForm /> : <RegistrationForm />}

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            {isLogin
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};
