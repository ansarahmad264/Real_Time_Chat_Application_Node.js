import dotenv from "dotenv"
dotenv.config({
    path: './.env'
})

import connectDB from "./db/connection.js"
import { app } from "./app.js"

app.get("/", (req, res) => {
    res.json({ success: true, data: {}, message: "Server is running ... .." })
})

connectDB()
.then(() =>{
    app.listen(process.env.PORT, '0.0.0.0', () => {
        console.log(`Server has Started at Port: ${process.env.PORT}`);
    })
})
.catch((err) =>{
    console.log(console.log("MongoDB Connection Failed", err))
})