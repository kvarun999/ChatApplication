import React, { useRef, useState } from "react";
import { useSocket } from "../../../context/SocketProvider";
import { useAuth } from "../../../context/AuthProvider";
import { ChatRoom, Message } from "../../../types/chat.types";
import { encryptFile, encryptMessage } from "../../../services/crypto.service";
import { sendEncryptedFile } from "../../../services/chat.service";
import { Paperclip, X } from "lucide-react"; // ✅ Imported icons for professional UI

interface MessageInputProps {
  chatRoom: ChatRoom;
  onNewMessage: (msg: Message) => void;
  onOptimisticUpdate: (chatroomId: string, message: Message) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  chatRoom,
  onNewMessage,
  onOptimisticUpdate,
}) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  const socket = useSocket();
  const { user } = useAuth();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = () => {
    if (!socket) return;

    if (!typingTimeoutRef.current) {
      socket.emit("start_typing", {
        userId: user?._id,
        chatroomId: chatRoom._id,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { chatroomId: chatRoom._id });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleFileSend = async (file: File) => {
    if (!file || !user) return;
    setIsSending(true);

    // 🛑 FIX: Declare optimisticMessage outside the try block so it is accessible in catch
    let optimisticMessage: Message | undefined;

    try {
      const myPrivateKey = localStorage.getItem("privateKey");
      if (!myPrivateKey) throw new Error("Private key not found!");

      const recipient = chatRoom.participants.find((p) => p._id !== user._id);
      if (!recipient) throw new Error("Recipient not found!");

      const myPublicKey = user.publicKey;
      if (!myPublicKey) throw new Error("My public key not found!");

      const cryptoData = await encryptFile(
        file,
        recipient.publicKey,
        myPrivateKey,
        myPublicKey
      );

      const totalChunks = cryptoData.encryptedChunks.length;

      // 1. GENERATE TEMPORARY MESSAGE ID AND OPTIMISTIC METADATA
      const tempId = `temp-${Date.now()}`;
      const createdAt = new Date().toISOString();

      // Assign the value here
      optimisticMessage = {
        _id: tempId,
        chatroomId: chatRoom._id,
        sender: user,
        type: file.type.startsWith("image/") ? "image" : "file",
        text: file.name,
        createdAt: createdAt,
        status: "sending",
        fileMetadata: {
          filename: file.name,
          fileUrl: "", // Temporary URL will be replaced
          mimetype: file.type,
          size: file.size,
          header: cryptoData.header,
          keyNonce: cryptoData.keyNonce,
          encryptedFileKeyForRecipient: cryptoData.encryptedKeyForRecipient,
          encryptedFileKeyForSender: cryptoData.encryptedKeyForSelf, // <-- SENDER'S KEY MATERIAL IS HERE
          keyId: cryptoData.keyId,
          totalChunks: totalChunks,
        },
      };

      // A. Update the chat window immediately (optimistic)
      onNewMessage(optimisticMessage);
      // B. Tell the parent page to update the chat list preview (optimistic)
      onOptimisticUpdate(chatRoom._id, optimisticMessage);

      // 2. PROCEED WITH UPLOAD
      const uniqueFileId = cryptoData.keyId;
      const originalFileExtension = file.name.substring(
        file.name.lastIndexOf(".")
      );

      const formData = new FormData();
      formData.append("originalFilename", file.name);

      cryptoData.encryptedChunks.forEach((chunk: string, idx: number) => {
        const binaryData = Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0));
        const blob = new Blob([binaryData], {
          type: "application/octet-stream",
        });
        const filenameForDisk = `${uniqueFileId}.chunk${idx}.enc`;
        formData.append("files", blob, filenameForDisk);
      });

      // Append encryption metadata (as before)
      formData.append("header", cryptoData.header);
      formData.append("keyNonce", cryptoData.keyNonce);
      formData.append(
        "encryptedKeyForRecipient",
        cryptoData.encryptedKeyForRecipient
      );
      formData.append("encryptedKeyForSelf", cryptoData.encryptedKeyForSelf);
      formData.append("keyId", cryptoData.keyId);
      formData.append("originalExtension", originalFileExtension);
      formData.append("totalChunks", totalChunks.toString());

      const uploadResult = await sendEncryptedFile(formData, chatRoom._id);

      if (!uploadResult) throw new Error("File upload failed");

      // We no longer call onNewMessage here; the socket confirmation handles the final state.

      setFile(null); // Clear file selection
    } catch (e) {
      console.error("Failed to encrypt and send file:", e);
      alert("Failed to send file. Please try again.");

      // On failure, rollback the optimistic message, only if it was successfully created.
      if (optimisticMessage) {
        // Check if it was successfully assigned a value
        onOptimisticUpdate(chatRoom._id, {
          ...optimisticMessage, // Use the last known good state
          text: `[Failed to Send: ${file.name}]`,
          status: "failed", // Use the 'failed' status for visual feedback
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageSend = async (text: string) => {
    if (!user) return;
    setIsSending(true);

    try {
      const myPrivateKey = localStorage.getItem("privateKey");
      if (!myPrivateKey) throw new Error("Private key not found!");

      const recipient = chatRoom.participants.find((p) => p._id !== user._id);
      if (!recipient) throw new Error("Recipient not found!");

      const createdAt = new Date().toISOString();

      const [encryptedPayloadRecipient, encryptedPayloadSender] =
        await Promise.all([
          encryptMessage(text, recipient.publicKey, myPrivateKey),
          encryptMessage(text, user.publicKey, myPrivateKey),
        ]);

      const messagePayload = {
        chatroomId: chatRoom._id,
        encryptedTextForRecipient: JSON.stringify(encryptedPayloadRecipient),
        encryptedTextForSender: JSON.stringify(encryptedPayloadSender),
      };

      const localMessage: Message = {
        _id: `temp-${Date.now()}`,
        chatroomId: chatRoom._id,
        sender: user,
        text: text,
        createdAt: createdAt,
        encryptedTextForRecipient: messagePayload.encryptedTextForRecipient,
        encryptedTextForSender: messagePayload.encryptedTextForSender,
        status: "sent",
        type: "text",
      };

      onNewMessage(localMessage);
      onOptimisticUpdate(chatRoom._id, localMessage);
      socket?.emit("send_message", messagePayload);

      setText("");
    } catch (e) {
      console.error("Failed to encrypt and send message:", e);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSending || (!text.trim() && !file)) return;

    // Run file send first, as it's typically the main action when a file is present
    if (file) {
      await handleFileSend(file);
    }

    // Only send text if it was present and not handled by the file send (though file send clears text)
    if (text.trim()) {
      await handleMessageSend(text);
    }
  };

  return (
    <div className="p-4 bg-gray-100 border-t border-gray-300">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        {/* Hidden Native File Input */}
        <input
          type="file"
          id="file-upload" // ID to link with the label/icon
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            // Optionally clear text input when a file is selected
            if (e.target.files?.[0]) setText("");
          }}
          className="hidden" // Hides the input element
        />

        {/* ✅ File Preview Bar (Conditional) */}
        {file && (
          <div className="flex items-center justify-between p-2 text-sm bg-blue-100 border border-blue-300 rounded-md shadow-sm">
            <span className="truncate pr-4 text-gray-700">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-blue-500 hover:text-red-500 transition-colors p-1"
              title="Remove attachment"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Text Input and Action Buttons Container */}
        <div className="flex items-stretch">
          {/* ✅ Attachment Button (Replaces ugly native input) */}
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center p-3 text-gray-500 border border-gray-300 rounded-l-md cursor-pointer bg-white hover:bg-gray-100 transition-colors"
            title="Attach File"
          >
            <Paperclip size={20} />
          </label>

          {/* Text Input */}
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            disabled={isSending || !!file} // Disable if file is selected
            className="flex-1 p-2 border border-y-gray-300 border-x-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
            placeholder={
              isSending
                ? "Sending..."
                : file
                  ? `Ready to send ${file.name}...`
                  : "Type a message..."
            }
          />
          <button
            type="submit"
            disabled={isSending || (!text.trim() && !file)}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSending ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
};
