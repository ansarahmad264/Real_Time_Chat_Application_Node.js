import express from "express"
import { getMessages, sendMessage } from "../Controllers/messageController.js"
import { verifyJWT } from "../Middlewares/Auth.js"
import { dmProtect } from "../Middlewares/messageAccessGuard.js"

const router = express.Router()

router.route("/send-message/:recieverId").post(verifyJWT, dmProtect, sendMessage)
router.route("/get-messages/:userToChatId").get(verifyJWT, getMessages)

export default router