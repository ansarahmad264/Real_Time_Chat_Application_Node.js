import {asyncHandler} from "express-async-handler";
import { User } from "../models/user.model.js";
import { ApiError } from "../Utils/ApiError.js";

export const dmProtect = asyncHandler(async (req, res, next) => {
    const senderId = req.user._id;
    const { recieverId } = req.params;

    // Validate input
    if (!recieverId) {
        throw new ApiError(400, "Receiver ID is required");
    }

    const [sender, receiver] = await Promise.all([
        User.findById(senderId).select("blockedUsers"),
        User.findById(recieverId).select("blockedUsers"),
    ]);

    if (!receiver) {
        throw new ApiError(404, "Receiver not found");
    }

    // If sender has blocked receiver
    if (sender.blockedUsers.includes(recieverId)) {
        throw new ApiError(403, "You have blocked this user. Unblock them to send a message.");
    }

    // If receiver has blocked sender
    if (receiver.blockedUsers.includes(String(senderId))) {
        throw new ApiError(403, "This user has blocked you. You can't send messages to them.");
    }

    next();
});
