import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "social-media-api/uploads",
      transformation: [
        {
          width: 500,
          height: 500,
          crop: "limit",
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    });

    console.log(`File uploaded to Cloudinary: ${response.secure_url}`);

    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    console.error(`Error uploading to Cloudinary: ${error.message}`);

    // Delete local file on error

    fs.unlinkSync(localFilePath);
    

    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`File deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error(`Error deleting from Cloudinary: ${error.message}`);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
