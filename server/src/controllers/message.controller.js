import Message from "../models/Message.js";
import ChatRoom from "../models/Chatroom.js";

// Existing helper function to update ChatRoom lastMessage/unreadCount
const updateChatRoom = async (message) => {
  const chatRoom = await ChatRoom.findById(message.chatroomId);
  if (chatRoom) {
    chatRoom.lastMessage = message._id;
    const sender = message.sender.toString();

    // Increment unread count for all other participants
    chatRoom.participants.forEach((participantId) => {
      const id = participantId.toString();
      if (id !== sender) {
        const currentCount = chatRoom.unreadCount.get(id) || 0;
        chatRoom.unreadCount.set(id, currentCount + 1);
      }
    });
    await chatRoom.save();
  }
};

const populateMessage = (messageId) => {
  return Message.findById(messageId)
    .populate("sender", "username publicKey avatarUrl")
    .exec();
};

export const saveMessage = async (messageData) => {
  // messageData MUST contain: chatroomId, sender, encryptedText (string)
  const {
    chatroomId,
    sender,
    encryptedTextForSender,
    encryptedTextForRecipient,
  } = messageData;

  try {
    // 1) Create message
    const newMessage = await Message.create({
      chatroomId,
      sender,
      encryptedTextForSender, // must be a string; client will JSON.stringify the payload
      encryptedTextForRecipient,
      type: "text", // Explicitly set type to text
    });

    // 2) Update chat’s lastMessage and unreadCount
    await updateChatRoom(newMessage);

    // 3) Return a populated message
    return await populateMessage(newMessage._id);
  } catch (err) {
    console.error("Error saving message:", err);
    throw err;
  }
};

// ✅ NEW FUNCTION: To save file messages
export const saveFileMessage = async (messageData) => {
  const {
    chatroomId,
    sender,
    type, // 'image' or 'file'
    fileMetadata,
  } = messageData;

  try {
    // 1) Create message
    const newMessage = await Message.create({
      chatroomId,
      sender,
      type,
      fileMetadata: fileMetadata,
    });

    // 2) Update chat’s lastMessage and unreadCount
    await updateChatRoom(newMessage);

    // 3) Return a populated message
    return await populateMessage(newMessage._id);
  } catch (err) {
    console.error("Error saving file message:", err);
    throw err;
  }
};

export const updateMessageStatus = async (messageId, status) => {
  try {
    await Message.findByIdAndUpdate(messageId, { status });
  } catch (err) {
    console.error("Error updating message status:", err);
  }
};
