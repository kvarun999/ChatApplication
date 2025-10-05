import Message from "../models/Message.js";
import ChatRoom from "../models/Chatroom.js";

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
    });

    // 2) Update chat’s lastMessage
    const chatRoom = await ChatRoom.findById(chatroomId);
    if (chatRoom) {
      chatRoom.lastMessage = newMessage._id;

      chatRoom.participants.forEach((participantId) => {
        const id = participantId.toString();

        if (id !== sender) {
          const currentCount = chatRoom.unreadCount.get(id) || 0;
          chatRoom.unreadCount.set(id, currentCount + 1);
        }
      });
      await chatRoom.save();
    }

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

export const updateMessageStatus = async (messageId, status) => {
  try {
    await Message.findByIdAndUpdate(messageId, { status });
  } catch (err) {
    console.error("Error updating message status:", err);
  }
};
