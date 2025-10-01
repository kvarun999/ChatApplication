import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthProvider";
import {
  updateUserPassword,
  updateUserProfile,
  updateUserAvatar,
} from "../../../services/user.service";
import { Link } from "react-router-dom";
import { User } from "../../../types";

const BackArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [newName, setNewName] = useState(user?.username || "");
  const [usernameSuccess, setUsernameSuccess] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isUsernameLoading, setIsUsernameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(
    user?.avatarUrl
      ? `http://localhost:3000${user.avatarUrl}`
      : "https://static.productionready.io/images/smiley-cyrus.jpg"
  );
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);

  useEffect(() => {
    // Check if the avatarUrl exists on the user object
    if (user?.avatarUrl) {
      // If the URL is already a full URL (from createObjectURL), use it directly.
      // Otherwise, construct the full URL from the server path.
      if (user.avatarUrl.startsWith("blob:")) {
        setAvatarPreview(user.avatarUrl);
      } else {
        setAvatarPreview(`http://localhost:3000${user.avatarUrl}`);
      }
    } else {
      // Fallback if the user has no avatar
      setAvatarPreview(
        "https://static.productionready.io/images/smiley-cyrus.jpg"
      );
    }
  }, [user?.avatarUrl]);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameSuccess("");
    setUsernameError("");
    if (!newName.trim() || user?.username === newName) return;

    setIsUsernameLoading(true);
    try {
      const updatedUser = await updateUserProfile(newName);
      updateUser(updatedUser as User);
      setUsernameSuccess("Username updated successfully!");
    } catch (err: any) {
      setUsernameError(err.response?.data?.message || "An error occurred.");
    } finally {
      setIsUsernameLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      return setPasswordError("New passwords do not match.");
    }
    if (newPassword.length < 8) {
      return setPasswordError("Password must be at least 8 characters long.");
    }

    setIsPasswordLoading(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.message || "An unexpected error occurred."
      );
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return setAvatarError("File is too large (max 2MB).");
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setAvatarError("");
      setAvatarSuccess("");
    }
  };

  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarFile) return setAvatarError("Please select a new image.");

    setAvatarError("");
    setAvatarSuccess("");
    setIsAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const updatedUser = await updateUserAvatar(formData);
      updateUser(updatedUser as User);
      setAvatarSuccess("Avatar updated successfully!");
      setAvatarFile(null);
    } catch (err: any) {
      setAvatarError(err.response?.data?.message || "Upload failed.");
    } finally {
      setIsAvatarLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="p-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <Link
          to="/"
          className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors font-semibold"
        >
          <BackArrowIcon />
          <span>Back to Chats</span>
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-lg p-8 space-y-8 bg-white shadow-xl rounded-2xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage your account settings
            </p>
          </div>

          <form
            onSubmit={handleAvatarSubmit}
            className="flex flex-col items-center space-y-4"
          >
            <img
              src={avatarPreview}
              alt="Profile Avatar"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
            />
            <input
              type="file"
              id="avatarInput"
              accept="image/png, image/jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="avatarInput"
              className="cursor-pointer bg-gray-100 text-gray-800 font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Choose Image
            </label>
            {avatarFile && (
              <div className="w-full flex flex-col items-center space-y-2">
                <p className="text-xs text-gray-600">{avatarFile.name}</p>
                <button
                  type="submit"
                  disabled={isAvatarLoading}
                  className="w-full max-w-xs py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:bg-green-300"
                >
                  {isAvatarLoading ? "Uploading..." : "Upload New Avatar"}
                </button>
              </div>
            )}
            {avatarError && (
              <p className="text-sm text-red-600">{avatarError}</p>
            )}
            {avatarSuccess && (
              <p className="text-sm text-green-600">{avatarSuccess}</p>
            )}
          </form>

          <hr />

          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="text-xl font-semibold text-gray-700 block mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isUsernameLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:bg-blue-300"
            >
              {isUsernameLoading ? "Saving..." : "Save Username"}
            </button>
            {usernameSuccess && (
              <p className="text-sm text-center text-green-600 mt-2">
                {usernameSuccess}
              </p>
            )}
            {usernameError && (
              <p className="text-sm text-center text-red-600 mt-2">
                {usernameError}
              </p>
            )}
          </form>

          <hr />

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Change Password
            </h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="text-sm font-semibold text-gray-700 block mb-2"
                >
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="text-sm font-semibold text-gray-700 block mb-2"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-semibold text-gray-700 block mb-2"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    Passwords do not match.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isPasswordLoading}
                className="w-full py-3 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-lg transition-colors disabled:bg-gray-400"
              >
                {isPasswordLoading ? "Changing..." : "Change Password"}
              </button>
            </form>
            {passwordSuccess && (
              <p className="text-sm text-center text-green-600 mt-4">
                {passwordSuccess}
              </p>
            )}
            {passwordError && (
              <p className="text-sm text-center text-red-600 mt-4">
                {passwordError}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
