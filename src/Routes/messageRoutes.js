import express from "express"
import { getMessages, sendMessage } from "../Controllers/messageController.js"
import { verifyJWT } from "../Middlewares/Auth.js"

const router = express.Router()

router.route("/send-message/:recieverId").post(verifyJWT, sendMessage)
router.route("/get-messages/:userToChatId").get(verifyJWT, getMessages)

export default router