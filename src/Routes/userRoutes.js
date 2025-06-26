import express from "express"
import { userLogin, userSignup } from "../Controllers/userController.js"
import { upload } from "../Middlewares/multer.js"

const router = express.Router()

router.route("/signup").post(upload.single("profilePic"), userSignup)
router.route("/login").post(userLogin)


export default router