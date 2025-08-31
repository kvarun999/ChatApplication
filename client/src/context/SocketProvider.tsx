import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { socket } from "../lib/socket"; // 🔹 The socket instance we made in socket.ts
import { useAuth } from "./AuthProvider"; // 🔹 Hook to get authentication state (user logged in or not)

// 1️⃣ Create a Context to hold the socket object.
//    This is like an "empty box" that we’ll fill with the socket.
const SocketContext = createContext(socket);

// 2️⃣ Custom hook so other components can easily grab the socket from Context.
//    Instead of writing useContext(SocketContext) everywhere, we just call useSocket().
export const useSocket = () => {
  return useContext(SocketContext);
};

// 3️⃣ Define the Provider that will wrap around your app.
//    It’s responsible for connecting/disconnecting the socket based on auth state.
export const SocketProvider = ({ children }: { children: ReactNode }) => {
  // 🔹 Get the current auth info (is user logged in? do we have an accessToken?)
  const { accessToken, isAuthenticated } = useAuth();

  // 4️⃣ Side-effect: Manage socket connection when auth state changes
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      // 🔹 Attach the token to the socket BEFORE connecting (for server auth)
      socket.auth = { token: accessToken };

      // 🔹 Manually connect the socket (since we disabled autoConnect in socket.ts)
      socket.connect();
    }

    // 🔹 Cleanup function:
    // When the component unmounts OR auth state changes (like user logs out),
    // this will automatically run and disconnect the socket.
    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, accessToken]);
  // 🔹 Runs whenever login/logout happens, or token changes.

  // 5️⃣ Provide the socket object to the rest of the app.
  //    Any component inside <SocketProvider> can now call useSocket() and use this socket instance.
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
