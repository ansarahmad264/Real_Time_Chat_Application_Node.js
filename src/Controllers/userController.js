import {ApiError} from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import { uploadOnCloudinary } from "../Utils/Cloudinary.js";
import User from "../Models/userModel.js";


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
export {
    userSignup,
    userLogin,
    userLogout,
    updateUserProfilePicture,
    changeCurrentPassword,
}