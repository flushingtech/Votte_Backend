const express = require('express');
const pool = require('../../db');
const router = express.Router();

// GET /api/search?q=...
router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json({ projects: [], developers: [], events: [] });

  const term = `%${q.trim()}%`;

  try {
    const [projectsRes, developersRes, eventsRes] = await Promise.all([
      pool.query(
        `SELECT i.id, i.idea AS title, i.description, i.email, i.image_url, i.event_id,
                u.name AS contributor_name, u.profile_picture
         FROM ideas i
         LEFT JOIN users u ON u.email = i.email
         WHERE i.idea ILIKE $1 OR i.description ILIKE $1
         ORDER BY i.created_at DESC
         LIMIT 5`,
        [term]
      ),
      pool.query(
        `SELECT email, name, profile_picture
         FROM users
         WHERE name ILIKE $1 OR email ILIKE $1
         ORDER BY name ASC
         LIMIT 5`,
        [term]
      ),
      pool.query(
        `SELECT id, title, event_date, link
         FROM events
         WHERE title ILIKE $1
         ORDER BY event_date DESC
         LIMIT 5`,
        [term]
      ),
    ]);

    res.json({
      projects:   projectsRes.rows,
      developers: developersRes.rows,
      events:     eventsRes.rows,
    });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;
