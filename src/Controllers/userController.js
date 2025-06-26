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


export {
    userSignup
}