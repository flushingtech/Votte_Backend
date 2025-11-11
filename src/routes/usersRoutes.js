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


// GET the date a user joined via email
router.get('/join-date/:email', async (req, res) => {
    const { email } = req.params;
    if (!email) {
        return res.status(400).json({ message: 'Missing required fields'})
    }

    try {
        const findStartDate = `
            SELECT created_at
            FROM users u
            WHERE u.email = $1
        `;
        
        const startDate = await pool.query(findStartDate, [email]);
        console.log(startDate.rows[0].created_at);
        res.status(200).json({ joinDate: startDate.rows[0].created_at })
    } catch(error) {
        console.error('The user email does not exist with that date:', error.message)
        res.status(500).json({ message: 'Failed to fetch join date', error: error.message })
    }

});

module.exports = router;