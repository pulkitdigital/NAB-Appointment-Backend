// Backend/services/imageUpload.service.js - PRODUCTION READY
import crypto from 'crypto';

/**
 * Generate Cloudinary signature for authenticated uploads
 */
const generateSignature = (paramsToSign, apiSecret) => {
  const sortedParams = Object.keys(paramsToSign)
    .sort()
    .map(key => `${key}=${paramsToSign[key]}`)
    .join('&');
  
  return crypto
    .createHash('sha1')
    .update(sortedParams + apiSecret)
    .digest('hex');
};

/**
 * Upload image to Cloudinary using signed upload (no preset needed)
 * @param {string} base64Image - Base64 encoded image
 * @param {string} folder - Folder name in Cloudinary (default: 'ca-profiles')
 * @param {string} customName - Custom name for the image (optional, will be slugified)
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export const uploadImage = async (base64Image, folder = 'ca-profiles', customName = null) => {
  try {
    // Validate base64 format
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image format');
    }

    const mimeType = matches[1];
    const data = matches[2];

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed');
    }

    // Calculate file size (base64 is ~33% larger)
    const sizeInBytes = (data.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 5) {
      throw new Error(`File size exceeds 5MB limit (current: ${sizeInMB.toFixed(2)}MB)`);
    }

    // Get Cloudinary credentials from environment
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
    }

    // Generate timestamp
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Create slugified public_id from custom name
    let publicId = null;
    if (customName) {
      publicId = customName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Prepare upload parameters
    const uploadParams = {
      timestamp: timestamp,
      folder: folder,
    };

    // Add public_id to params if provided
    if (publicId) {
      uploadParams.public_id = publicId;
    }

    // Generate signature
    const signature = generateSignature(uploadParams, apiSecret);

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('file', base64Image);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('folder', folder);
    formData.append('signature', signature);
    
    // Add public_id to form data if provided
    if (publicId) {
      formData.append('public_id', publicId);
    }

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Cloudinary error response:', errorData);
      throw new Error(errorData.error?.message || 'Cloudinary upload failed');
    }

    const result = await response.json();
    return result.secure_url;

  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} imageUrl - Public URL of the image
 * @returns {Promise<boolean>} - Success status
 */
export const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) {
      return false;
    }

    // Extract public_id from URL
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) {
      console.error('❌ Invalid Cloudinary URL format');
      return false;
    }

    // Get everything after 'upload/v123/' = 'ca-profiles/filename.jpg'
    const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
    // Remove extension
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');

    // Get Cloudinary credentials
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('❌ Cloudinary delete credentials missing in .env');
      return false;
    }

    // Generate signature for delete request
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

    // Prepare delete request
    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('signature', signature);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());

    // Send delete request
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const result = await response.json();

    if (result.result === 'ok') {
      return true;
    } else {
      console.error('❌ Cloudinary delete failed:', result);
      return false;
    }

  } catch (error) {
    console.error('❌ Cloudinary delete error:', error.message);
    return false;
  }
};

/**
 * Update profile picture
 * - Uploads new image
 * - Deletes old image if exists
 * @param {string} newImageBase64 - New base64 image
 * @param {string} oldImageUrl - Old image URL to delete (optional)
 * @param {string} customName - Custom name for the image (optional)
 * @returns {Promise<string>} - New image public URL
 */
export const updateProfilePicture = async (newImageBase64, oldImageUrl = null, customName = null) => {
  try {
    // Upload new image first
    const newImageUrl = await uploadImage(newImageBase64, 'ca-profiles', customName);

    // Delete old image if exists
    if (oldImageUrl) {
      await deleteImage(oldImageUrl);
    }

    return newImageUrl;

  } catch (error) {
    console.error('❌ Error updating profile picture:', error);
    throw error;
  }
};

// Export all functions
export default {
  uploadImage,
  deleteImage,
  updateProfilePicture
};