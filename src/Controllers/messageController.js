import Conversation from "../Models/conversation.model.js"
import Message from "../Models/message.model.js"
import { asyncHandler } from "../Utils/asyncHandler.js";
import { getRecieverSocketId, io } from "../socket/socket.js"
import sendPushNotification from "../Utils/FcmNotification.js";
import User from "../Models/userModel.js";
import { chatWithMemory } from "../Chatbot/ChatbotLangGraph.js"

const sendMessage = asyncHandler(async (req, res) => {
    try {
        const { message } = req.body;
        const { recieverId } = req.params;
        const senderId = req.user._id;
        const AI_USER_ID = process.env.AI_USER_ID;

        // 🔄 Get or create conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recieverId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, recieverId]
            });
        }

        // 💬 Save user's message
        const userMessage = new Message({
            senderId,
            recieverId,
            message,
            conversationId: conversation._id
        });

        await Promise.all([conversation.save(), userMessage.save()]);

        // 👇 If chatting with the AI bot
        if (recieverId.toString() === AI_USER_ID) {
            const aiReply = await chatWithMemory(message, senderId);

            const aiMessage = new Message({
                senderId: AI_USER_ID,
                recieverId: senderId,
                message: aiReply,
                conversationId: conversation._id
            });

            await aiMessage.save();

            const recieverSocketId = getRecieverSocketId(senderId); // send reply back to original sender
            if (recieverSocketId) {
                io.to(recieverSocketId).emit("newMessage", aiMessage);
            }
        } else {
            // 📲 Notify human recipient
            const recieverSocketId = getRecieverSocketId(recieverId);
            if (recieverSocketId) {
                io.to(recieverSocketId).emit("newMessage", userMessage);
            } else {
                const receiver = await User.findById(recieverId);
                if (receiver?.fcmToken) {
                    await sendPushNotification(
                        receiver.fcmToken,
                        "New Message",
                        `You have a new message from ${req.user.fullName || 'someone'}`,
                    );
                }
            }
        }

        res.status(201).json({
            message,
            from: req.user.fullName,
            to: recieverId
        });

    } catch (error) {
        console.log("Error in SendMessage Controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


const getMessages = asyncHandler(async (req, res) => {
    try {
        const { userToChatId } = req.params
        const senderId = req.user._id

        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, userToChatId] }
        })

        if (!conversation) {
            return res.status(404).json({ message: "No conversation found" });
        }

        const messagesRaw = await Message.find({ conversationId: conversation._id })
            .sort({ createdAt: 1 }) // oldest first
            .populate("senderId", "fullName username")
            .populate("recieverId", "fullName username");

        const messages = messagesRaw.map(msg => ({
            _id: msg._id,
            Sender: `${msg.senderId.fullName} (${msg.senderId.username})`,
            Receiver: `${msg.recieverId.fullName} (${msg.recieverId.username})`,
            Message: msg.message
        }));
        res.status(200).json(messages)

    } catch (error) {
        console.log("Error in getMessage Controller", error.message)
        return res.status(500).json({ error: "internal Server Error" })
    }
})

const deleteMessage = asyncHandler(async (req, res) => {
    const { message_id } = req.params;

    if (!message_id) {
        return res.status(400).json({ msg: "Message ID is required." });
    }

    const deletedMessage = await Message.findByIdAndUpdate(
        message_id,
        {
            $set: {
                message: "This message has been deleted."
            },
        },
        { new: true } // return the updated document
    );

    if (!deletedMessage) {
        return res.status(404).json({ msg: "Message not found." });
    }

    return res.status(200).json({ msg: "Message deleted (soft delete)", message: deletedMessage });
});

export {
    sendMessage,
    getMessages,
    deleteMessage
}