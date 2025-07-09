import mongoose from "mongoose";
import bcryptjs from "bcryptjs"
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema({
    fullName: {
        type: String
    },
    username: {
        type: String,
        unique: true,
        sparse: true // only enforced if present
    },
    email: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        minlength: 6,
        select: false
    },
    profilePic: {
        type: String,
        default: ""
    },
    authProvider: {
        type: String,
        enum: ["local", "google"],
        required: true,
        default: "local"
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    refreshToken: {
        type: String
    },
    fcmToken: {
        type: String
    },
    otp: {
      type: Number,
      default: null,
    },
    otp_verified: {
      type: Boolean,
      default: false,
    }
})

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next()

    this.password = await bcryptjs.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcryptjs.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            userName: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            userName: this.username,
            fullName: this.fullName
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;