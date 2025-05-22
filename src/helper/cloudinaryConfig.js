const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryUploadFiles = async (files, folder, customFilenamePrefix = '') => {
    try {
      const filesCloudinaryInfo = [];
  
      for (const [index, file] of files.entries()) {
        const { path, originalname } = file;
  
        const extension = originalname.split('.').pop();
        const filename = `${customFilenamePrefix}-${Date.now()}-${index}.${extension}`;
  
        const newPath = await cloudinary.uploader.upload(path, {
          folder,
          public_id: filename,
          use_filename: true,
          unique_filename: false,
          overwrite: true,
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
