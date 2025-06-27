import express from "express"
import { changeCurrentPassword, getAllUsersForSidebar, refreshAccessToken, updateUserAccountDetails, updateUserProfilePicture, userLogin, userLogout, userSignup } from "../Controllers/userController.js"
import { verifyJWT } from "../Middlewares/Auth.js"
import { upload } from "../Middlewares/multer.js"

const router = express.Router()

router.route("/signup").post(upload.single("profilePic"), userSignup)
router.route("/login").post(userLogin)


//Secured Routes
router.route("/logout").post(verifyJWT, userLogout)
router.route("/update-profile-picture").patch(verifyJWT, upload.single("profilePic"), updateUserProfilePicture)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/update-account").patch(verifyJWT, updateUserAccountDetails)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/get-users").get(verifyJWT, getAllUsersForSidebar)

export default router