import Message from "../models/Message.js";
import ChatRoom from "../models/Chatroom.js";

export const saveMessage = async (messageData) => {
  const { chatRoomId, senderId, encryptedText } = messageData;

  try {
    const newMessage = new Message({
      chatRoomId,
      senderId,
      encryptedText,
    });
    await newMessage.save();

    await ChatRoom.findsByIdAndUpdate(chatRoomId, {
      lastMessage: newMessage._id,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "username publicKey avatarUrl")
      .exec();

    return populatedMessage;
  } catch (err) {
    console.error("Error saving message:", err);
  }
};
