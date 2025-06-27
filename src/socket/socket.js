import { Server } from "socket.io"
import http from "http"
import express from "express"

const app = express()

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:4000"],
        methods: ["GET", "POST"],
    },
})

export const getRecieverSocketId = (recieverId) => {
    return userSocketMap[recieverId]
}

const userSocketMap = {}; //{userId: socketId}

io.on("connection", (socket) => {
    console.log("a user connected", socket.id);

    socket.on("addUser", (userId) => {
        userSocketMap[userId] = socket.id;
        console.log("User connected:", userId, socket.id);
    });

    socket.on("disconnect", () => {
        console.log("user disconnected", socket.id)

        // Clean up userSocketMap
        for (const [userId, socketId] of Object.entries(userSocketMap)) {
            if (socketId === socket.id) {
                delete userSocketMap[userId];
                break;
            }
        }
    })
})

export {app, io, server}
