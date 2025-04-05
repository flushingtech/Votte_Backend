const express = require('express');
const pool = require('../../db'); // update path as needed
const router = express.Router();

// GET: Public route to get top 3 ideas
router.get('/discord/top-ideas', async (req, res) => {
  try {
    const query = `
      SELECT idea, description, likes 
      FROM ideas 
      ORDER BY likes DESC, created_at DESC 
      LIMIT 3;
    `;
    const result = await pool.query(query);
    res.status(200).json({ ideas: result.rows });
  } catch (error) {
    console.error('Error fetching top ideas for Discord:', error.message);
    res.status(500).json({ message: 'Failed to fetch ideas for Discord' });
  }
});

module.exports = router;
