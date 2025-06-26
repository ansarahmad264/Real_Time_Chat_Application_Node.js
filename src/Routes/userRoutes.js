import express from "express"
import { updateUserProfilePicture, userLogin, userLogout, userSignup } from "../Controllers/userController.js"
import { verifyJWT } from "../Middlewares/Auth.js"
import { upload } from "../Middlewares/multer.js"

const router = express.Router()

router.route("/signup").post(upload.single("profilePic"), userSignup)
router.route("/login").post(userLogin)


//Secured Routes
router.route("/logout").post(verifyJWT, userLogout)
router.route("/update-profile-picture").patch(verifyJWT, upload.single("profilePic"), updateUserProfilePicture)


export default router