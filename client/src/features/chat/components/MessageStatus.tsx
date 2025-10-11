import React from "react";

// client/src/features/chat/components/MessageStatus.tsx

interface MessageStatusProps {
  // ✅ FIX: Update the status prop type to match your global Message type
  status: "sending" | "sent" | "delivered" | "read" | "failed"; // <-- CHANGE THIS LINE
  isMe: boolean;
}

// ... (rest of the MessageStatus component code)

const SentTick = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const DeliveredTick = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
    <path d="M15 6l-9 9" />
  </svg>
);

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status,
  isMe,
}) => {
  if (!isMe) return null;

  const color = status === "read" ? "#4ade80" : "rgba(255, 255, 255, 0.6)";

  return (
    <div className="ml-1" style={{ color }}>
      {status === "sent" && <SentTick />}
      {(status === "delivered" || status === "read") && <DeliveredTick />}
    </div>
  );
};
