import {ApiError} from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import { uploadOnCloudinary } from "../Utils/Cloudinary.js";
import User from "../Models/userModel.js";
import jwt from "jsonwebtoken"


const userSignup = asyncHandler(async(req,res) =>{
    const {fullName, username, email, password, confirmPassword ,gender} = req.body

    if(password != confirmPassword){
        throw new ApiError(400, "Password Do not Match")
    }

    if(!email || !username){
        throw new ApiError(400, "email and username are Required")
    }

    const existedUser = await User.findOne({
        $or: [{email}, {username}]
    })

    if(existedUser){
        throw new ApiError(400, "User with this Email or username already exist")
    }

    const profilePicLocalpath = req.file?.path
    if(!profilePicLocalpath){
        throw new ApiError(400,"Avatar file is required 1")
    }

    const profilePicture = await uploadOnCloudinary(profilePicLocalpath)
    if(!profilePicture.url){
        throw new ApiError(400,"Error while uploading the file")
    }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        gender,
        profilePic: profilePicture.url
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"Server was unable to seve user to the Database")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})


const generateAccessAndRefreshToken = async(userId) => {
    try{
        const user  = await User.findById(userId)
        const accessToken =  user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    }catch(error){
     throw new ApiError(500,"something Went wrong while generating Refresh and Access Token")   
    }
}
const userLogin = asyncHandler(async(req,res) =>{
    const {email, password} = req.body

    if(!email || !password){
        throw new ApiError(400, "All Fields are Required")
    } 

    const user = await User.findOne({email})
    if(!user){
        throw new ApiError(404, "This User Doesnot Exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(404,"Invalid User Credentials")
    }

    const { accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
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

const userLogout = asyncHandler(async(req,res) =>{
   await User.findByIdAndUpdate(
    req.user._id,
    {
        $set: {
            refreshToken: undefined
        }
    },
    {
        new:true
    }
   )

   const options ={
    httpOnly: true,
    secure: true
   }

   return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User Logged out Successfully")
    )
})

const updateUserProfilePicture = asyncHandler(async(req,res) => {
    const profilePicLocalpath = req.file?.path

    if(!profilePicLocalpath){
        throw new ApiError(400, "Profile Picture file is missing")
    }

    const profilePicture = await uploadOnCloudinary(profilePicLocalpath)
    if(!profilePicture.url){
        throw new ApiError(400,"Error while uploading the file")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                profilePic: profilePicture.url
            }
        },
        {
            new:true
        }
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"User Profile Picture Updated Successfully"))
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {newPassword, oldPassword} = req.body
    if(!newPassword || !oldPassword){
        throw new ApiError(400, "All Fields are Required")
    }

    const user = await User.findById(req.user._id)
    
    const isOldPasswordValid = await user.isPasswordCorrect(oldPassword)
    if(!isOldPasswordValid){
        throw new ApiError(400, "Invalid old Password")
    }

    if(oldPassword == newPassword){
        throw new ApiError(400, "New Password Cannot be same as Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

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

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "User account details updated successfully.")
    );
});

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incommingRefreshToken){
        throw new ApiError( 401, "Unathurized request")
    }

    const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user  = await User.findById(decodedToken?._id)

    if(!user){
        throw new ApiError(401, "Invalid Refresh Token")
    }

    if(incommingRefreshToken !== user?.refreshToken){
        throw new ApiError(401, "Refresh Token Expired or used ")
    }

    const {newAccessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)

    const options ={
        httpOnly:true,
        secure:true
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

const getAllUsersForSidebar = asyncHandler(async(req,res) => {
    try {
        const loggedInUserId = req.user._id
        const filteredUsers = await User.find({_id: {$ne: loggedInUserId}}).select("-password -refreshToken -_id")

        return res.status(200).json(filteredUsers)
        
    } catch (error) {
        console.log("Error in Get User for Sidebar", error.message)
        return res.status(500).json({error: "Internal Server Error"})
    }
})

export {
    userSignup,
    userLogin,
    userLogout,
    updateUserProfilePicture,
    changeCurrentPassword,
    updateUserAccountDetails,
    refreshAccessToken,
    getAllUsersForSidebar
}