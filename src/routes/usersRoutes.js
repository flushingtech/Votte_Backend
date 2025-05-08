const express = require('express');
const pool = require('../../db');
const router = express.Router();

// GET all users (for contributor dropdown)
router.get('/all-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, email FROM users ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

module.exports = router;
