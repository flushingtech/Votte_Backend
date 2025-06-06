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
  
  router.post('/upload-event/:eventId', upload, async (req, res) => {
    try {
      const { eventId } = req.params;
      const files = req.files;
  
      if (!files || files.length === 0) {
        console.log('❌ No files uploaded');
        return res.status(400).json({ message: 'No files uploaded' });
      }
  
      // OPTIONAL: Get event name from DB if you want cleaner folder names
      const eventQuery = await pool.query('SELECT title FROM events WHERE id = $1', [eventId]);
      const eventName = eventQuery.rows[0]?.title?.replace(/\s+/g, '-').toLowerCase() || `event-${eventId}`;
  
      const uploaded = await cloudinaryUploadFiles(files, 'votte_events', `event-${eventId}-${eventName}`);
  
      // Save image_url to DB
      await pool.query(`UPDATE events SET image_url = $1 WHERE id = $2`, [uploaded[0].cloudinary_url, eventId]);
  
      res.status(201).json({
        message: 'Image uploaded and event updated successfully',
        data: uploaded[0],
      });
    } catch (err) {
      console.error('❌ Upload error:', err.message);
      res.status(500).json({ message: 'Upload failed', error: err.message });
    }
  });
  
  

module.exports = router;
