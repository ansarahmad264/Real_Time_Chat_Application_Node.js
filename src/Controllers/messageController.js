import Conversation from "../Models/conversation.model.js"
import Message from "../Models/message.model.js"
import { asyncHandler } from "../Utils/asyncHandler.js";
import { getRecieverSocketId, io } from "../socket/socket.js"

const sendMessage = asyncHandler(async (req, res) => {
    try {
        const { message } = req.body
        const { recieverId } = req.params
        const senderId = req.user._id

        var conversation = await Conversation.findOne({
            participants: {
                $all: [senderId, recieverId]
            }
        })

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, recieverId]
            })
        }

        const newMessage = new Message({
            senderId,
            recieverId,
            message,
            conversationId: conversation._id
        })

        //This will run in Parallel
        await Promise.all([conversation.save(), newMessage.save()])

        const recieverSocketId = getRecieverSocketId(recieverId)

        if (recieverSocketId) {
            io.to(recieverSocketId).emit("newMessage", newMessage)
        }
        /* else{
            // User is offline ->  Send FCM notification
            const receiver = await User.findById(recieverId);

            if (receiver && receiver.fcmToken) {
                await sendFCMNotification(
                    receiver.fcmToken,
                    "New Message",
                    `You have a new message from ${req.user.fullName || 'someone'}`,
                );
            }
        } */

        res.status(201).json({
            message,
            from: `${req.user.fullName}`,
            to: `${recieverId}`
        });

    } catch (error) {
        console.log("Error in SendMessage Controler", error.message)
        return res.status(500).json({ error: "internal Server Error" })
    }
})

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

export {
    sendMessage,
    getMessages
}