const express = require('express');
const router = express.Router();
const pool = require('../../db'); // PostgreSQL pool connection

// Authorized admin emails
const authorizedAdmins = ['flushingtech.nyc@gmail.com', 'admin2@example.com'];

router.post('/add-event', async (req, res) => {
    const { email, title, eventDate } = req.body;

    if (!authorizedAdmins.includes(email)) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO events (title, event_date) VALUES ($1, $2) RETURNING *',
            [title, eventDate]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding event' });
    }
});

// Endpoint to get all events
router.get('/all-events', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events ORDER BY event_date ASC');
        res.json({ events: result.rows });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Error fetching events' });
    }
});

module.exports = router;
