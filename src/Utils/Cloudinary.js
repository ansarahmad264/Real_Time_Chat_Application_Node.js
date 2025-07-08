import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localFilePath) => {
    try{
        
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        //file has been uploaded siccesfully
        console.log("File has been sucessfully Uploaded", response.url)
        fs.unlinkSync(localFilePath)
        return response;

    }catch (error) {
        console.error("❌ Cloudinary upload failed:", error); // <-- Print the actual error

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // cleanup temp file
        }

        throw error; // Let it bubble up instead of silently failing
    }
}

export {uploadOnCloudinary}