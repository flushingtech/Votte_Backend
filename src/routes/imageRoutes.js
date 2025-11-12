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

  router.post('/upload-idea-event/:ideaId/:eventId', upload, async (req, res) => {
    try {
      const { ideaId, eventId } = req.params;
      const files = req.files;

      console.log('📸 Upload request received:', { ideaId, eventId, filesCount: files?.length });

      if (!files || files.length === 0) {
        console.log('❌ No files uploaded');
        return res.status(400).json({ message: 'No files uploaded' });
      }

      // Get idea and event names for better organization
      const ideaQuery = await pool.query('SELECT idea FROM ideas WHERE id = $1', [ideaId]);
      const eventQuery = await pool.query('SELECT title FROM events WHERE id = $1', [eventId]);
      const ideaName = ideaQuery.rows[0]?.idea?.replace(/\s+/g, '-').toLowerCase() || `idea-${ideaId}`;
      const eventName = eventQuery.rows[0]?.title?.replace(/\s+/g, '-').toLowerCase() || `event-${eventId}`;

      console.log('📤 Uploading to Cloudinary...');
      const uploaded = await cloudinaryUploadFiles(files, 'votte_idea_events', `idea-${ideaId}-${ideaName}-event-${eventId}-${eventName}`);
      console.log('✅ Uploaded to Cloudinary:', uploaded[0].cloudinary_url);

      // Check if metadata entry exists
      const metadataCheck = await pool.query(
        'SELECT * FROM idea_event_metadata WHERE idea_id = $1 AND event_id = $2',
        [ideaId, eventId]
      );

      if (metadataCheck.rowCount === 0) {
        // First event - update main ideas table
        console.log('💾 Updating main ideas table');
        await pool.query(`UPDATE ideas SET image_url = $1 WHERE id = $2`, [uploaded[0].cloudinary_url, ideaId]);
      } else {
        // Additional event - update metadata table (try/catch for column not existing)
        console.log('💾 Updating idea_event_metadata table');
        try {
          await pool.query(
            `UPDATE idea_event_metadata SET image_url = $1 WHERE idea_id = $2 AND event_id = $3`,
            [uploaded[0].cloudinary_url, ideaId, eventId]
          );
        } catch (updateErr) {
          console.error('❌ Column might not exist, falling back to main table:', updateErr.message);
          // Fallback: update main ideas table instead
          await pool.query(`UPDATE ideas SET image_url = $1 WHERE id = $2`, [uploaded[0].cloudinary_url, ideaId]);
        }
      }

      res.status(201).json({
        message: 'Image uploaded successfully for this event',
        data: uploaded[0],
      });
    } catch (err) {
      console.error('❌ Upload error:', err.message, err);
      res.status(500).json({ message: 'Upload failed', error: err.message });
    }
  });



module.exports = router;
