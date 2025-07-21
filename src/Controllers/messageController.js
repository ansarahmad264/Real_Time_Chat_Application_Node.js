import Conversation from "../Models/conversation.model.js"
import Message from "../Models/message.model.js"
import { asyncHandler } from "../Utils/asyncHandler.js";
import {ApiError} from "../Utils/ApiError.js"
import { getRecieverSocketId, io } from "../socket/socket.js"
import sendPushNotification from "../Utils/FcmNotification.js";
import User from "../Models/user.model.js";
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
            participants: { $all: [senderId, userToChatId] },   
            deletedFor: { $nin: [senderId] }
        })

        if (!conversation) {
            return res.status(404).json({ message: "No conversation found" });
        }

        const messagesRaw = await Message.find(
            { 
            conversationId: conversation._id,
            deletedFor: { $ne: senderId } 
            })
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
    const currentUserId = req.user._id;

    if (!message_id) {
        return res.status(400).json({ msg: "Message ID is required." });
    }

    // Find the message first
    const message = await Message.findById(message_id);

    if (!message) {
        return res.status(404).json({ msg: "Message not found." });
    }

    //Only allow deletion if current user is the sender
    if (message.senderId.toString() !== currentUserId.toString()) {
        return res.status(403).json({ msg: "You can only delete messages you have sent." });
    }

    // Perform soft delete
    message.message = "This message has been deleted.";
    await message.save();

    return res.status(200).json({ msg: "Message deleted (soft delete)", message });
});

const deleteMessageForMe = asyncHandler(async (req, res) => {
    const { message_id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(message_id);

    if (!message) {
        throw new ApiError(400, "Message not found" )
    }

    // Already deleted?
    if (message.deletedFor.includes(userId)) {
       throw new ApiError(200, "Message already deleted for this user" )
    }

    message.deletedFor.push(userId);
    await message.save();

    return res.status(200).json({ msg: "Message deleted for you" });
});

const clearConversation = asyncHandler(async(req,res)=>{
    const {conversation_id} = req.params
    
    if(!conversation_id){
        throw new ApiError(400, "conversation Id is required")
    }

    const conversation = await Conversation.findById(conversation_id)
    if(!conversation){
        throw new ApiError(400, "Conversation not Found")
    }

    // Already deleted?
    if (conversation.deletedFor.includes(req.user._id)) {
        throw new ApiError(200,"Message already deleted for this user")
    }

    if(conversation.participants.includes(process.env.AI_USER_ID)){
        await Message.deleteMany({ conversationId: conversation_id })
        await Conversation.findByIdAndDelete(conversation_id)
        return res.status(200).json({msg: "Conversation has been Cleared"})
    }
    else{
        conversation.deletedFor.push(req.user._id)
        await conversation.save()

        if(conversation.deletedFor.length >= 2){
            await Message.deleteMany({ conversationId: conversation_id })
            await Conversation.findByIdAndDelete(conversation_id)
        }

        return res.status(200).json({msg: "Conversation has been Cleared"})
    }
})

const getAllConversation = asyncHandler(async(req,res)=>{
    const conversation = await Conversation.find({
        participants: { $in: [req.user._id] },
        deletedFor: { $nin: [req.user._id] }
      });
    
    return res.json({status:200, data:conversation})
})

export {
    sendMessage,
    getMessages,
    deleteMessage,
    deleteMessageForMe,
    clearConversation,
    getAllConversation
}