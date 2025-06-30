import express from "express"
import { changeCurrentPassword, getAllUsersForSidebar, googleCallback, refreshAccessToken, updateUserAccountDetails, /*updateUserProfilePicture,*/ userLogin, userLogout, userSignup } from "../Controllers/userController.js"
import { verifyJWT } from "../Middlewares/Auth.js"
//import { upload } from "../Middlewares/multer.js"
import passport from 'passport';

const router = express.Router()

//router.route("/signup").post(upload.single("profilePic"), userSignup)

router.route("/signup").post(userSignup)
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


//Secured Routes
router.route("/logout").post(verifyJWT, userLogout)
//router.route("/update-profile-picture").patch(verifyJWT, upload.single("profilePic"), updateUserProfilePicture)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/update-account").patch(verifyJWT, updateUserAccountDetails)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/get-users").get(verifyJWT, getAllUsersForSidebar)

export default router