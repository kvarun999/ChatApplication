import React, { useState } from "react";
import { useAuth } from "../../../context/AuthProvider";
import { registerUser } from "../../../services/auth.service";

export const RegistrationForm = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (confirmPassword !== password) {
      setError("password should be the same");
      setIsLoading(false);
      return;
    }

    try {
      const data = await registerUser({ username, email, password });
      // If registration is successful, log the user in with the new token
      if (data.accessToken) {
        login(data.accessToken);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-2xl rounded-2xl px-10 pt-8 pb-10 space-y-6 border border-gray-100"
      >
        <h2 className="text-3xl font-extrabold text-center text-gray-900">
          Create an Account
        </h2>

        {error && (
          <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-center">
            {error}
          </p>
        )}

        {/* Username */}
        <div>
          <label
            className="block text-gray-700 text-sm font-semibold mb-1"
            htmlFor="username"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label
            className="block text-gray-700 text-sm font-semibold mb-1"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label
            className="block text-gray-700 text-sm font-semibold mb-1"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label
            className="block text-gray-700 text-sm font-semibold mb-1"
            htmlFor="ConfirmPassword"
          >
            Confirm Password
          </label>
          <input
            id="ConfirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none
          ${
            confirmPassword && confirmPassword !== password
              ? "border-red-500 bg-red-50 text-red-700 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }
        `}
            required
          />
          {confirmPassword && confirmPassword !== password && (
            <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-lg shadow-lg transform transition-transform duration-150 hover:scale-[1.02]"
        >
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
};
