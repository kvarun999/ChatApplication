import React, { useState } from "react";
import { RegistrationForm } from "../components/RegistrationForm";
import LoginForm from "../components/LoginForm";

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Welcome to Secure Chat
        </h1>
        {isLogin ? <LoginForm /> : <RegistrationForm />}

        <button
          onClick={() => {
            setIsLogin(!isLogin);
          }}
        >
          {isLogin
            ? "Don't have an account? Register"
            : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};
