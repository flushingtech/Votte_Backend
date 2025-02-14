const express = require('express');
const pool = require('../../db'); // Database connection
const router = express.Router();

// POST: Submit or Update a Vote
router.post('/vote', async (req, res) => {
  const { user_email, idea_id, event_id, vote_type } = req.body;

  if (!user_email || !idea_id || !event_id || !vote_type) {
      return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
      // Check if a vote already exists
      const existingVoteQuery = `
          SELECT * FROM votes WHERE user_email = $1 AND event_id = $2 AND vote_type = $3;
      `;
      const existingVoteResult = await pool.query(existingVoteQuery, [user_email, event_id, vote_type]);

      if (existingVoteResult.rowCount > 0) {
          // Update the existing vote
          const updateVoteQuery = `
              UPDATE votes
              SET idea_id = $1, updated_at = NOW()
              WHERE user_email = $2 AND event_id = $3 AND vote_type = $4
              RETURNING *;
          `;
          const updatedVote = await pool.query(updateVoteQuery, [idea_id, user_email, event_id, vote_type]);
          return res.status(200).json({ message: 'Vote updated successfully', vote: updatedVote.rows[0] });
      } else {
          // Insert a new vote
          const insertVoteQuery = `
              INSERT INTO votes (user_email, idea_id, event_id, vote_type)
              VALUES ($1, $2, $3, $4)
              RETURNING *;
          `;
          const newVote = await pool.query(insertVoteQuery, [user_email, idea_id, event_id, vote_type]);
          return res.status(201).json({ message: 'Vote added successfully', vote: newVote.rows[0] });
      }
  } catch (error) {
      console.error('Error handling vote:', error);
      res.status(500).json({ message: 'Failed to handle vote' });
  }
});

  
router.get('/votes/idea/:idea_id', async (req, res) => {
  const { idea_id } = req.params;
  const { vote_type } = req.query; // Optional filter by vote type

  try {
      let fetchVotesQuery = `SELECT * FROM votes WHERE idea_id = $1`;
      let queryParams = [idea_id];

      if (vote_type) {
          fetchVotesQuery += ` AND vote_type = $2`;
          queryParams.push(vote_type);
      }

      const result = await pool.query(fetchVotesQuery, queryParams);
      res.status(200).json({ votes: result.rows });
  } catch (error) {
      console.error('Error fetching votes for idea:', error);
      res.status(500).json({ message: 'Failed to fetch votes' });
  }
});


// DELETE: Unvote
router.delete('/unvote', async (req, res) => {
  const { user_email, event_id, vote_type } = req.body;

  if (!user_email || !event_id || !vote_type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const deleteQuery = `
      DELETE FROM votes WHERE user_email = $1 AND event_id = $2 AND vote_type = $3 RETURNING *;
    `;
    const result = await pool.query(deleteQuery, [user_email, event_id, vote_type]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Vote not found' });
    }

    res.status(200).json({ message: 'Vote removed successfully', removedVote: result.rows[0] });
  } catch (error) {
    console.error('Error removing vote:', error);
    res.status(500).json({ message: 'Failed to remove vote' });
  }
});


// GET: Fetch user's vote for a specific event & vote type
router.get('/user-vote', async (req, res) => {
  const { user_email, event_id, vote_type } = req.query;

  if (!user_email || !event_id || !vote_type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `SELECT idea_id FROM votes WHERE user_email = $1 AND event_id = $2 AND vote_type = $3`,
      [user_email, event_id, vote_type]
    );

    if (result.rowCount === 0) {
      return res.status(200).json({ userVote: null });
    }

    res.status(200).json({ userVote: result.rows[0].idea_id });
  } catch (error) {
    console.error('Error fetching user vote:', error);
    res.status(500).json({ message: 'Failed to fetch user vote' });
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