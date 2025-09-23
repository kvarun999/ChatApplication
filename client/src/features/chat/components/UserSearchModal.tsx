import React, { useState, useEffect } from "react";
import { User } from "../../../types";
import { searchUsers } from "../../../services/user.service";
import { createChatRoom } from "../../../services/chat.service";

interface UserSearchModalProps {
  onClose: () => void;
  onChatCreated: () => void; // A function to tell the ChatPage to refresh its list
}

export const UserSearchModal = ({
  onClose,
  onChatCreated,
}: UserSearchModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This effect runs a "debounced" search whenever the user stops typing
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setResults([]);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const response = await searchUsers(searchTerm);
        console.log(response);
        setResults(response.items || []); // Only use the items array!
        setError(null);
      } catch (err) {
        setError("Failed to search for users.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    // Debounce time: 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const handleStartChat = async (recipientId: string) => {
    try {
      await createChatRoom(recipientId);
      onChatCreated(); // Tell the parent component that a chat was created
      onClose(); // Close the modal
    } catch (err) {
      setError("Failed to start chat. Maybe one already exists?");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Start a New Chat</h2>
        <input
          type="text"
          placeholder="Search for users by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md mb-4"
        />
        <div className="max-h-60 overflow-y-auto">
          {loading && <p className="text-center text-gray-500">Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          {results.length > 0 &&
            results.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md"
              >
                <p className="font-semibold">{user.username}</p>
                <button
                  onClick={() => handleStartChat(user._id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                >
                  Chat
                </button>
              </div>
            ))}
          {!loading && searchTerm && results.length === 0 && (
            <p className="text-center text-gray-500">No users found.</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-200 p-2 rounded-md hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
};
