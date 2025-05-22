const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryUploadFiles = async (files, folder) => {
  try {
    const filesCloudinaryInfo = [];

    for (const file of files) {
      const { path, originalname } = file;

      const newPath = await cloudinary.uploader.upload(path, {
        folder: folder,
        use_filename: true,
        unique_filename: true,
        filename_override: originalname,
      });

      filesCloudinaryInfo.push({
        cloudinary_id: newPath.public_id,
        cloudinary_url: newPath.secure_url,
        originalname: file.originalname,
      });
    }

    return filesCloudinaryInfo;
  } catch (error) {
    console.log(error);
  }
};

module.exports = { cloudinaryUploadFiles };
