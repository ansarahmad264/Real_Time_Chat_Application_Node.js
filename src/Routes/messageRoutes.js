import express from "express"
import { sendMessage } from "../Controllers/messageController.js"
import { verifyJWT } from "../Middlewares/Auth.js"

const router = express.Router()

router.route("/send-message/:recieverId").post(verifyJWT, sendMessage)

export default router