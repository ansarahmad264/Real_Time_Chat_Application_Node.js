import Conversation from "../Models/conversation.model.js"
import Message from "../Models/message.model.js"
import { asyncHandler } from "../Utils/asyncHandler.js";
// import { getRecieverSocketId, io } from "../socket/socket.js"

const sendMessage = asyncHandler(async(req,res) =>{
    try {
        const {message} = req.body
        const{recieverId } = req.params
        const senderId = req.user._id

        var conversation = await Conversation.findOne({
            participants: {
                $all: [senderId, recieverId]
            }
        })

        if(!conversation){
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

        // const recieverSocketId = getRecieverSocketId(recieverId)
        // if(recieverSocketId){
        //     io.to(recieverSocketId).emit("newMessage", newMessage)
        // }

        res.status(201).json(newMessage)
        
    } catch (error) {
        console.log("Error in SendMessage Controler",error.message)
        return res.status(500).json({error: "internal Server Error"})
    }
})

export {
    sendMessage
}