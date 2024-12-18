const express = require('express');
const pool = require('../../db'); // Database connection
const router = express.Router();

router.post('/vote', async (req, res) => {
    const { user_email, idea_id, rating } = req.body;
  
    if (!user_email || !idea_id || !rating) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
  
    if (rating < 1 || rating > 10) {
      return res.status(400).json({ message: 'Rating must be between 1 and 10' });
    }
  
    try {
      // Check if a vote already exists
      const existingVoteQuery = `
        SELECT * FROM votes WHERE user_email = $1 AND idea_id = $2;
      `;
      const existingVoteResult = await pool.query(existingVoteQuery, [user_email, idea_id]);
  
      if (existingVoteResult.rowCount > 0) {
        // Update the existing vote
        const updateVoteQuery = `
          UPDATE votes
          SET rating = $1
          WHERE user_email = $2 AND idea_id = $3
          RETURNING *;
        `;
        const updatedVote = await pool.query(updateVoteQuery, [rating, user_email, idea_id]);
        return res.status(200).json({ message: 'Vote updated successfully', vote: updatedVote.rows[0] });
      } else {
        // Insert a new vote
        const insertVoteQuery = `
          INSERT INTO votes (user_email, idea_id, rating)
          VALUES ($1, $2, $3)
          RETURNING *;
        `;
        const newVote = await pool.query(insertVoteQuery, [user_email, idea_id, rating]);
        return res.status(201).json({ message: 'Vote added successfully', vote: newVote.rows[0] });
      }
    } catch (error) {
      console.error('Error handling vote:', error);
      res.status(500).json({ message: 'Failed to handle vote' });
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

// Update average scores for each idea in Stage 3
router.put('/update-average-scores', async (req, res) => {
    try {
      console.log('Calculating average scores for all ideas...');
  
      // Step 1: Calculate average rating for each idea
      const averageScoreQuery = `
        SELECT idea_id, AVG(rating) AS average_score
        FROM votes
        GROUP BY idea_id;
      `;
  
      const { rows: averageScores } = await pool.query(averageScoreQuery);
      console.log('Average scores calculated:', averageScores);
  
      // Step 2: Update the average_score in the ideas table
      for (const { idea_id, average_score } of averageScores) {
        const updateScoreQuery = `
          UPDATE ideas
          SET average_score = $1, updated_at = NOW()
          WHERE id = $2;
        `;
        await pool.query(updateScoreQuery, [average_score, idea_id]);
      }
  
      res.status(200).json({ message: 'Average scores updated successfully.' });
    } catch (error) {
      console.error('Error updating average scores:', error.message);
      res.status(500).json({ message: 'Failed to update average scores.', error: error.message });
    }
  });
  
module.exports = router;