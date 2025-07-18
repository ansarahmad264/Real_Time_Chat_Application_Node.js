import express from "express"
import { blockUser, changeCurrentPassword, findUserByEmail, forgotPassword, getAllUsersForSidebar, getChattedUsers, googleCallback, refreshAccessToken, resetPassword, unblockUser, updateFcmToken, updateUserAccountDetails, updateUserProfilePicture, userLogin, userLogout, userSignup, verifyEmail } from "../Controllers/userController.js"
import { verifyJWT } from "../Middlewares/Auth.js"
import { upload } from "../Middlewares/multer.js"
import passport from 'passport';

const router = express.Router()

router.route("/signup").post(upload.single("profilePic"), userSignup)
router.route("/login").post(userLogin)

//google Routes
router.get( '/google', passport.authenticate('google', 
    {
      scope: ['profile', 'email'],
      session: false,
    })
);

router.get('/google/callback', passport.authenticate('google', 
    {
      failureRedirect: '/login',
      session: false,
    }),
    googleCallback
);

router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

//Secured Routes
router.route("/logout").post(verifyJWT, userLogout)
router.route("/update-profile-picture").patch(verifyJWT, upload.single("profilePic"), updateUserProfilePicture)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/update-account").patch(verifyJWT, updateUserAccountDetails)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/get-all-users").get(verifyJWT, getAllUsersForSidebar)
router.route('/update-fcm-token').post(verifyJWT, updateFcmToken)
router.route('/get-users').get(verifyJWT, getChattedUsers)
router.route('/find-user').post(verifyJWT, findUserByEmail)
router.route('/block-user/:userIdToBlock').post(verifyJWT,blockUser)
router.route('/unblock-user/:userIdToUnblock').post(verifyJWT, unblockUser)


export default router