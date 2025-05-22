const express = require('express');
const { upload } = require('../helper/multer');
const { cloudinaryUploadFiles } = require('../helper/cloudinaryConfig');
const pool = require('../../db');
const router = express.Router();

router.post('/upload/:ideaId', upload, async (req, res) => {
    try {
      const { ideaId } = req.params;
      const files = req.files;
  
      if (!files || files.length === 0) {
        console.log('❌ No files uploaded');
        return res.status(400).json({ message: 'No files uploaded' });
      }
  
      // OPTIONAL: Get idea name from DB if you want prettier names
      const ideaQuery = await pool.query('SELECT idea FROM ideas WHERE id = $1', [ideaId]);
      const ideaName = ideaQuery.rows[0]?.idea?.replace(/\s+/g, '-').toLowerCase() || `idea-${ideaId}`;
  
      const uploaded = await cloudinaryUploadFiles(files, 'votte_ideas', `idea-${ideaId}-${ideaName}`);
  
      // Save image_url to DB
      await pool.query(`UPDATE ideas SET image_url = $1 WHERE id = $2`, [uploaded[0].cloudinary_url, ideaId]);
  
      res.status(201).json({
        message: 'Image uploaded and idea updated successfully',
        data: uploaded[0],
      });
    } catch (err) {
      console.error('❌ Upload error:', err.message);
      res.status(500).json({ message: 'Upload failed', error: err.message });
    }
  });  
  

module.exports = router;
