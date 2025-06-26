import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async() => {
    try {
        const fullUri = `${process.env.MONGODB_URI}/${DB_NAME}`;
        console.log("Connecting to:", fullUri);
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        console.log(`\n MongoDb Connection Successfull!! DB Host ${connectionInstance.connection.host}`)
        
    } catch (error) {
        console.log("Database Connection FAILED:" + error)
        process.exit(1)
    }
}

export default connectDB;