import { v2 as cloudinary } from "cloudinary";
import config from "../config/config.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

/**
 * Upload profile picture to Cloudinary
 * 
 * @param {Buffer} fileBuffer 
 * @param {String} fileName 
 * @returns {Promise<Object>} 
 */
export async function uploadProfileImage(fileBuffer, fileName) {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "music-platform/profiles",
          public_id: `profile_${Date.now()}_${fileName.split(".")[0]}`,
          transformation: [
            {
              width: 300,
              height: 300,
              crop: "fill",
              gravity: "face",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Profile upload failed: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        },
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    throw new Error(`Cloudinary upload error: ${error.message}`);
  }
}

/**
 * Delete file from Cloudinary
 * 
 * @param {String} publicId 
 * @returns {Promise<Object>} 
 */
export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary delete error: ${error.message}`);
  }
}

export default {
  uploadProfileImage,
  deleteFromCloudinary,
};
