import dotenv from "dotenv"
dotenv.config({
    path: './.env'
})

import connectDB from "./db/connection.js"
import { app } from "./app.js"

connectDB()
.then(() =>{
    app.listen(process.env.PORT,() => {
        console.log(`Server has Started at Port: ${process.env.PORT}`);
    })
})
.catch((err) =>{
    console.log(console.log("MongoDB Connection Failed", err))
})