import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import passport from "passport";
import './config/passport.js';
import { fileURLToPath } from "url";
import path from "path";
// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser());
app.use(passport.initialize())
app.use(express.static(path.join(__dirname, "../public")));

//IMPORT ROUTES
import userRouter from "./Routes/userRoutes.js"
import messageRouter from "./Routes/messageRoutes.js"

//DECLARE ROUTES
app.use("/api/v1/user", userRouter)
app.use("/api/v2/message", messageRouter)


export { app }