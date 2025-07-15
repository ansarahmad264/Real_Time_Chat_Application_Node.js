import express from "express"
import { clearConversation, deleteMessage, deleteMessageForMe, getMessages, sendMessage } from "../Controllers/messageController.js"
import { verifyJWT } from "../Middlewares/Auth.js"
import { dmProtect } from "../Middlewares/messageAccessGuard.js"

const router = express.Router()

router.route("/send-message/:recieverId").post(verifyJWT, dmProtect, sendMessage)
router.route("/get-messages/:userToChatId").get(verifyJWT, getMessages)
router.route('/delete-message/:message_id').patch(verifyJWT, deleteMessage)
router.route('/delete-forme/:message_id').patch(verifyJWT, deleteMessageForMe)
router.route('/clear-conversation/:conversation_id').patch(verifyJWT, clearConversation)

export default router