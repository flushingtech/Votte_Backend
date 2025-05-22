const express = require('express');
const { upload } = require('../helper/multer');
const { cloudinaryUploadFiles } = require('../helper/cloudinaryConfig');

const router = express.Router();

router.post('/upload', upload, async (req, res) => {
    try {
      const files = req.files;
  
      if (!files || files.length === 0) {
        console.log('❌ No files received in upload');
        return res.status(400).json({ message: 'No files uploaded' });
      }
  
      console.log(`📤 Received ${files.length} file(s):`);
      files.forEach((f, i) => {
        console.log(`  ${i + 1}: ${f.originalname}`);
      });
  
      const uploaded = await cloudinaryUploadFiles(files, 'votte_ideas');
  
      console.log('✅ Successfully uploaded to Cloudinary:', uploaded.map(f => f.cloudinary_url));
  
      res.status(201).json({
        message: 'Image(s) uploaded successfully',
        data: uploaded,
      });
    } catch (err) {
      console.error('❌ Image upload error:', err.message);
      res.status(500).json({ message: 'Upload failed', error: err.message });
    }
  });
  

module.exports = router;
