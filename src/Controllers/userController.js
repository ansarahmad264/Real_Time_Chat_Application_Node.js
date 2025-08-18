import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import { uploadOnCloudinary } from "../Utils/Cloudinary.js";
import User from "../Models/user.model.js";
import jwt from "jsonwebtoken"
import sendPushNotification from "../Utils/FcmNotification.js"
import crypto from "crypto"
import { sendPasswordResetEmail, sendResetSuccessEmail, sendVerificationEmail, sendWelcomeEmail } from "../Utils/nodemailerEmail.js";
import Message from "../Models/message.model.js"
import mongoose from "mongoose";


const userSignup = asyncHandler(async (req, res) => {
    // ALL THE COMMENTED CODE IS TO REMOVE THE IMAGE HANDLING and GENDER FIELD TEMPORARILY

    const { fullName, username, email, password, confirmPassword, fcmToken } = req.body

    if (password != confirmPassword) {
        throw new ApiError(400, "Password Do not Match")
    }

    if (!email || !username) {
        throw new ApiError(400, "email and username are Required")
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existedUser) {
        throw new ApiError(400, "User with this Email or username already exist")
    }

    //IMAGE FUNCTIONALITY
    const profilePicLocalpath = req.file?.path
    var profilePic;

    if (profilePicLocalpath) {


        const profilePicture = await uploadOnCloudinary(profilePicLocalpath)
        if (!profilePicture.url) {
            throw new ApiError(400, "Error while uploading the file")
        }

        profilePic = profilePicture.url
    }
    else {
        profilePic = `https://avatar.iran.liara.run/username?username=${username}`
    }

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        fcmToken,
        profilePic,
        verificationToken,
        verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, //24 hour
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Server was unable to save user to the Database")
    }

    await sendVerificationEmail(user.email, verificationToken);

    if (fcmToken) {
        await sendPushNotification(
            fcmToken,
            "Welcome to ChatApp 🚀",
            "You’ve successfully signed up!"
        );
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const verifyEmail = asyncHandler(async (req, res) => {
    const { code } = req.body;
    try {
        const user = await User.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();

        await sendWelcomeEmail(user.email, user.name);

        res.status(200).json({
            success: true,
            message: "Email verified successfully",
            user: {
                ...user._doc,
                password: undefined,
            },
        });
    } catch (error) {
        console.log("error in verifyEmail ", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "something Went wrong while generating Refresh and Access Token")
    }
}
const userLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        throw new ApiError(400, "All Fields are Required")
    }

    const user = await User.findOne({ email }).select("+password")
    if (!user) {
        throw new ApiError(404, "This User Doesnot Exist")
    }

    if (user.authProvider == "google") {
        throw new ApiError(404, "You have registed via social platform , please try to go with that!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(404, "Invalid User Credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    await sendPushNotification(
        loggedInUser.fcmToken,
        "Congratulations",
        "You’ve Logged In successfully!"
    );

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged in Successfully"
            )
        )

})

const userLogout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    await sendPushNotification(
        req.user.fcmToken,
        "Logout",
        "You’ve Logged Out successfully!"
    );

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User Logged out Successfully")
        )
})

const updateUserProfilePicture = asyncHandler(async (req, res) => {
    const profilePicLocalpath = req.file?.path

    if (!profilePicLocalpath) {
        throw new ApiError(400, "Profile Picture file is missing")
    }

    const profilePicture = await uploadOnCloudinary(profilePicLocalpath)
    if (!profilePicture.url) {
        throw new ApiError(400, "Error while uploading the file")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                profilePic: profilePicture.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User Profile Picture Updated Successfully"))
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { newPassword, oldPassword } = req.body
    if (!newPassword || !oldPassword) {
        throw new ApiError(400, "All Fields are Required")
    }

    const user = await User.findById(req.user._id)

    const isOldPasswordValid = await user.isPasswordCorrect(oldPassword)
    if (!isOldPasswordValid) {
        throw new ApiError(400, "Invalid old Password")
    }

    if (oldPassword == newPassword) {
        throw new ApiError(400, "New Password Cannot be same as Old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    await sendPushNotification(
        req.user.fcmToken,
        "Change Password",
        "Your Password has been Changed Successfully"
    );

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password has been Changed Successfully"))


})

const updateUserAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email, gender, username } = req.body;

    // Build update object dynamically
    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;
    if (email) updateFields.email = email;
    if (gender) updateFields.gender = gender;
    if (username) updateFields.username = username;

    // If no valid fields provided
    if (Object.keys(updateFields).length === 0) {
        throw new ApiError(400, "At least one field is required to update.");
    }

    // Check for existing email or username only if provided
    if (email || username) {
        const existingUser = await User.findOne({
            _id: { $ne: req.user._id }, // exclude current user
            $or: [
                ...(email ? [{ email }] : []),
                ...(username ? [{ username }] : [])
            ]
        });

        if (existingUser) {
            throw new ApiError(400, "Email or username is already in use by another user.");
        }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new: true }
    ).select("-password -refreshToken");

    await sendPushNotification(
        req.user.fcmToken,
        "Update Details",
        "User Account Details has been Updated Succesfully"
    );

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "User account details updated successfully.")
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError(401, "Unathurized request")
    }

    const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError(401, "Invalid Refresh Token")
    }

    if (incommingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh Token Expired or used ")
    }

    const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", newAccessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                },
                "AccessTokenRefreshed"
            )
        )


})

const getAllUsersForSidebar = asyncHandler(async (req, res) => {
    try {
        const loggedInUserId = req.user._id
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password -refreshToken -_id")

        return res.status(200).json(filteredUsers)

    } catch (error) {
        console.log("Error in Get User for Sidebar", error.message)
        return res.status(500).json({ error: "Internal Server Error" })
    }
})

const googleCallback = asyncHandler(async (req, res) => {
    try {
        const user = req.user;

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        const options = {
            httpOnly: true,
            secure: true,
        }

        res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .redirect("http://localhost:3000/chats")

    } catch (err) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
});

const updateFcmToken = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { fcmToken } = req.body;

    if (!fcmToken) return res.status(400).json({ message: "FCM token is required" });

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { fcmToken },
            { new: true }
        );

        return res.status(200).json({ message: "FCM token updated", user });
    } catch (error) {
        console.error("Failed to update FCM token:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt;

        await user.save();

        // send email
        await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

        res.status(200).json({ success: true, message: "Password reset link sent to your email" });
    } catch (error) {
        console.log("Error in forgotPassword ", error);
        res.status(400).json({ success: false, message: error.message });
    }
});

const resetPassword = asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
        }

        // update password

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;
        await user.save();

        await sendResetSuccessEmail(user.email);

        res.status(200).json({ success: true, message: "Password reset successful" });
    } catch (error) {
        console.log("Error in resetPassword ", error);
        res.status(400).json({ success: false, message: error.message });
    }
});

const getChattedUsers = asyncHandler(async (req, res) => {

    const currentUserId = req.user._id

    try {
        const users = await Message.aggregate([
            {
                //Find messages where the current user is either the senderId or recieverId.
                $match: {
                    $or: [
                        { senderId: new mongoose.Types.ObjectId(currentUserId) },
                        { recieverId: new mongoose.Types.ObjectId(currentUserId) }
                    ]
                }
            },
            {
                //From each message, figure out who the other user is (not you).
                $project: {
                    otherUser: {
                        $cond: [
                            { $eq: ["$senderId", new mongoose.Types.ObjectId(currentUserId)] },
                            "$recieverId",
                            "$senderId"
                        ]
                    }
                }
            },
            {
                //Get unique users only (no duplicates).
                $group: {
                    _id: "$otherUser"
                }
            },
            {
                //Fetch the details of those users from the users collection.
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            {
                $unwind: "$userInfo"
            },
            {
                //Return only the info you want: name, email, etc.
                $project: {
                    _id: "$userInfo._id",
                    fullName: "$userInfo.fullName",
                    email: "$userInfo.email",
                    profilePic: "$userInfo.profilePic",
                    username: "$userInfo.username"
                }
            }
        ]);

        if(!users || users == ""){
            throw new ApiError(404, "No users found")
        }

        res.status(200).json(users);

    } catch (error) {
        console.log("Error fetching Users", error);
        throw new ApiError(500, "Internal Server Error")
    }

    return users;
});

const findUserByEmailOrUsername = asyncHandler(async (req, res) => {
    try {
        const { value } = req.body;

        // Validate input
        if (!value || typeof value !== "string" || !value.trim()) {
            return res.status(400).json({ message: "Invalid value provided. Must be a non-empty string." });
        }

        const searchValue = value.trim();

        // Case-insensitive search using regex
        const user = await User.findOne({
            $or: [
                { email: { $regex: new RegExp(`^${searchValue}$`, 'i') } },
                { username: { $regex: new RegExp(`^${searchValue}$`, 'i') } }
            ]
        }).select("fullName email profilePic username");

        if (!user) {
            return res.status(404).json({ message: "No user found with that email or username." });
        }

        return res.status(200).json({ user });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

const blockUser = asyncHandler(async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { userIdToBlock } = req.params;
      
        if (currentUserId.toString() === userIdToBlock) {
          throw new ApiError(400, "You cannot block yourself.");
        }
    
        const user = await User.findById(currentUserId);
        if (!user) {
          throw new ApiError(404, "User not found.");
        }
      
        if (user.blockedUsers.includes(userIdToBlock)) {
          return res.status(200).json({ message: "User already blocked." });
        }
        console.log(userIdToBlock)
        user.blockedUsers.push(userIdToBlock);
        await user.save();
        console.log(user.blockedUsers)
        return res.status(200)
        .json({ message: "User blocked successfully." , user});
    
    } catch (error) {
        console.log("Internal Server Error", error)        
    }
});

const unblockUser = asyncHandler(async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { userIdToUnblock } = req.params;

        if (currentUserId.toString() === userIdToUnblock) {
            throw new ApiError(400, "You cannot unblock yourself.");
        }

        const user = await User.findById(currentUserId);
        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        //indexOf find the index of the value in array
        // if found return 1 if not found retrun -1
        const index = user.blockedUsers.indexOf(userIdToUnblock);
        if (index === -1) {
            return res.status(200).json({ message: "User is not blocked." });
        }

        //modifies the original array by removing or replacing existing elements and/or adding new ones.
        //1 tells it to remove one item starting from that index.
        user.blockedUsers.splice(index, 1);
        await user.save();

        return res.status(200).json({ message: "User unblocked successfully." });

    } catch (error) {
        console.log("Internal Server Error", error);
    }
});

const getUserProfile = asyncHandler(async (req,res) => {
    const user = await User.findById(req.user._id)
    .select("fullName username profilePic isVerified email -_id")

    if (!user) {
        return res.status(404).json(new ApiResponse(404, null, "User not found"));
      }

    return res.json(new ApiResponse(200, {user},))     
})

const userHome = asyncHandler (async (req, res) => {
    const user =  await User.findById(req.user._id)
                        .select("fullName username profilePic email isverified")
    
    const filteredUsers = await User.find({ _id: { $ne: user._id } }).select("fullName username profilePic")
    console.log(filteredUsers)

    return res.json(new ApiResponse(200, {user, filteredUsers}))
})


export {
    userSignup,
    userLogin,
    userLogout,
    updateUserProfilePicture,
    changeCurrentPassword,
    updateUserAccountDetails,
    refreshAccessToken,
    getAllUsersForSidebar,
    googleCallback,
    updateFcmToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getChattedUsers,
    findUserByEmailOrUsername,
    blockUser,
    unblockUser,
    getUserProfile,
    userHome
}