import dotenv from "dotenv"
dotenv.config({
    path: './.env'
})

import connectDB from "./db/connection.js"
import { app } from "./app.js"
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
    //res.json({ success: true, data: {}, message: "Updated configuration and CI/CD Pipeline Setup. Workflows and Server is running Successfully... .." })
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