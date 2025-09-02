import Message from "../models/Message.js";
import ChatRoom from "../models/Chatroom.js";

export const saveMessage = async (messageData) => {
  // messageData MUST contain: chatroomId, sender, encryptedText (string)
  const { chatroomId, sender, encryptedText } = messageData;

  try {
    // 1) Create message
    const newMessage = await Message.create({
      chatroomId,
      sender,
      encryptedText, // must be a string; client will JSON.stringify the payload
    });

    // 2) Update chat’s lastMessage
    await ChatRoom.findByIdAndUpdate(chatroomId, {
      lastMessage: newMessage._id,
    });

    // 3) Return a populated message (sender fields)
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "username publicKey avatarUrl")
      .exec();

    return populatedMessage;
  } catch (err) {
    console.error("Error saving message:", err);
    throw err;
  }
};
