const express = require('express');
const pool = require('../../db'); // Database connection
const router = express.Router();

// Add a vote to an idea
router.post('/vote', async (req, res) => {
  const { user_email, idea_id, rating } = req.body;

  if (!user_email || !idea_id || !rating) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (rating < 1 || rating > 10) {
    return res.status(400).json({ message: 'Rating must be between 1 and 10' });
  }

  try {
    const insertVoteQuery = `
      INSERT INTO votes (user_email, idea_id, rating)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(insertVoteQuery, [user_email, idea_id, rating]);
    res.status(201).json({ message: 'Vote added successfully', vote: result.rows[0] });
  } catch (error) {
    console.error('Error adding vote:', error);
    res.status(500).json({ message: 'Failed to add vote' });
  }
});

// Get all votes for an idea
router.get('/idea/:idea_id', async (req, res) => {
  const { idea_id } = req.params;

  try {
    const fetchVotesQuery = `
      SELECT * FROM votes WHERE idea_id = $1;
    `;
    const result = await pool.query(fetchVotesQuery, [idea_id]);
    res.status(200).json({ votes: result.rows });
  } catch (error) {
    console.error('Error fetching votes for idea:', error);
    res.status(500).json({ message: 'Failed to fetch votes' });
  }
});

// Get all votes by a user
router.get('/user/:user_email', async (req, res) => {
  const { user_email } = req.params;

  try {
    const fetchUserVotesQuery = `
      SELECT * FROM votes WHERE user_email = $1;
    `;
    const result = await pool.query(fetchUserVotesQuery, [user_email]);
    res.status(200).json({ votes: result.rows });
  } catch (error) {
    console.error('Error fetching user votes:', error);
    res.status(500).json({ message: 'Failed to fetch user votes' });
  }
});

// Update a vote
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 10) {
    return res.status(400).json({ message: 'Rating must be between 1 and 10' });
  }

  try {
    const updateVoteQuery = `
      UPDATE votes
      SET rating = $1
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(updateVoteQuery, [rating, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Vote not found' });
    }

    res.status(200).json({ message: 'Vote updated successfully', vote: result.rows[0] });
  } catch (error) {
    console.error('Error updating vote:', error);
    res.status(500).json({ message: 'Failed to update vote' });
  }
});


module.exports = router;
