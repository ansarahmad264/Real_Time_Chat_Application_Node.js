import express from "express"
import { userSignup } from "../Controllers/userController.js"
import { upload } from "../Middlewares/multer.js"

const router = express.Router()

router.route("/signup").post(upload.single("profilePic"), userSignup)


export default router