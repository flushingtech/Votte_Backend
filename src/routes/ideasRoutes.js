const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool();  // PostgreSQL connection

// Endpoint to submit an idea
router.post('/submitIdea', async (req, res) => {
  const { google_id, idea } = req.body;

  console.log('Received idea submission:', { google_id, idea });  // Log incoming data

  try {
    const insertQuery = 'INSERT INTO ideas (google_id, idea) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(insertQuery, [google_id, idea]);

    console.log('Idea inserted successfully:', result.rows[0]);  // Log successful insert

    res.status(201).json({
      message: 'Idea submitted successfully',
      idea: result.rows[0]
    });
  } catch (error) {
    console.error('Error while inserting idea:', error);  // Log any errors
    res.status(500).json({ message: 'Failed to submit idea', error: error.message });
  }
});

module.exports = router;
