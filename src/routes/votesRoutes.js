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

  // POST endpoint for voting Most Creative Idea
  router.post('/most-creative/vote', async (req, res) => {
    const { user_email, idea_id, event_id } = req.body;
  
    if (!user_email || !idea_id || !event_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
  
    try {
      // Upsert the vote (insert or update)
      const result = await pool.query(
        `INSERT INTO most_creative (user_email, idea_id, event_id) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_email, event_id) 
         DO UPDATE SET idea_id = EXCLUDED.idea_id
         RETURNING *`,
        [user_email, idea_id, event_id]
      );
  
      res.status(200).json({
        message: 'Vote recorded successfully!',
        vote: result.rows[0],
      });
    } catch (error) {
      console.error('Error submitting Most Creative vote:', error);
      res.status(500).json({ message: 'Failed to submit vote' });
    }
  });

// GET endpoint to fetch the Most Creative Idea for an event
router.get("/most-creative/:event_id", async (req, res) => {
  const { event_id } = req.params;

  try {
      const result = await pool.query(
          `SELECT idea_id, COUNT(*) AS votes
           FROM most_creative
           WHERE event_id = $1
           GROUP BY idea_id
           ORDER BY votes DESC
           LIMIT 1`, 
          [event_id]
      );

      if (result.rowCount === 0) {
          return res.status(404).json({ message: "No votes yet for this event" });
      }

      res.status(200).json({
          message: "Most Creative Idea found!",
          most_creative_idea: result.rows[0],
      });
  } catch (error) {
      console.error("Error fetching Most Creative Idea:", error);
      res.status(500).json({ message: "Failed to fetch Most Creative Idea" });
  }
});

// DELETE endpoint to remove Most Creative vote
router.delete('/most-creative/unvote', async (req, res) => {
  const { user_email, event_id } = req.body;

  if (!user_email || !event_id) {
      return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
      const deleteQuery = `DELETE FROM most_creative WHERE user_email = $1 AND event_id = $2 RETURNING *;`;
      const result = await pool.query(deleteQuery, [user_email, event_id]);

      if (result.rowCount === 0) {
          return res.status(404).json({ message: 'Vote not found' });
      }

      res.status(200).json({ message: 'Vote removed successfully', removedVote: result.rows[0] });
  } catch (error) {
      console.error('Error removing vote:', error);
      res.status(500).json({ message: 'Failed to remove vote' });
  }
});

// GET endpoint to check if the user has already voted for Most Creative
router.get('/most-creative/user-vote', async (req, res) => {
    const { user_email, event_id } = req.query;  // ✅ Use query parameters

    console.log("Fetching user vote for:", { user_email, event_id });

    if (!user_email || !event_id) {
        console.error("Missing required fields:", { user_email, event_id });
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            `SELECT idea_id FROM most_creative WHERE user_email = $1 AND event_id = $2`,
            [user_email, event_id]
        );

        console.log("Query result:", result.rows);

        if (result.rowCount === 0) {
            return res.status(200).json({ userVote: null }); // No vote found
        }

        res.status(200).json({ userVote: result.rows[0].idea_id });
    } catch (error) {
        console.error('Error fetching user vote:', error.message);
        res.status(500).json({ message: 'Failed to fetch user vote', error: error.message });
    }
});



  
module.exports = router;