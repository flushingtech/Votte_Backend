const pool = require('../db');

// Controller functions for voting
const votingController = {
  voteForIdea: async (req, res) => {
    const { ideaId } = req.params;
    const { userId } = req.body;

    try {
      // Check if user already voted for this idea
      const existingVote = await pool.query('SELECT * FROM user_votes WHERE user_id = $1 AND idea_id = $2', [userId, ideaId]);
      if (existingVote.rows.length > 0) {
        return res.status(400).json({ error: 'User already voted for this idea' });
      }

      // Insert new vote
      await pool.query('INSERT INTO user_votes (user_id, idea_id) VALUES ($1, $2)', [userId, ideaId]);

      // Increment votes count for the idea
      await pool.query('UPDATE ideas SET votes = votes + 1 WHERE id = $1', [ideaId]);

      res.status(201).json({ message: 'Vote added successfully' });
    } catch (error) {
      console.error('Error adding vote:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  deleteVoteForIdea: async (req, res) => {
    const { ideaId } = req.params;
    const { userId } = req.body;

    try {
      // Check if user has voted for this idea
      const existingVote = await pool.query('SELECT * FROM user_votes WHERE user_id = $1 AND idea_id = $2', [userId, ideaId]);
      if (existingVote.rows.length === 0) {
        return res.status(404).json({ error: 'User has not voted for this idea' });
      }

      // Delete the vote
      await pool.query('DELETE FROM user_votes WHERE user_id = $1 AND idea_id = $2', [userId, ideaId]);

      // Decrement votes count for the idea
      await pool.query('UPDATE ideas SET votes = votes - 1 WHERE id = $1', [ideaId]);

      res.status(200).json({ message: 'Vote removed successfully' });
    } catch (error) {
      console.error('Error removing vote:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  getUserVotes: async (req, res) => {
    const userId = 123; // Replace with actual user ID
    try {
      const result = await pool.query('SELECT idea_id FROM user_votes WHERE user_id = $1', [userId]);
      const userVotes = result.rows.map((row) => ({ idea_id: row.idea_id }));
      res.status(200).json(userVotes);
    } catch (error) {
      console.error('Error fetching user votes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  resetAllVotes: async (req, res) => {
    try {
        // Delete all user votes
        await pool.query('DELETE FROM user_votes');

        // Reset votes count for all ideas
        await pool.query('UPDATE ideas SET votes = 0');

        res.status(200).json({ message: 'Vote count reset successfully for all ideas' });
    } catch (error) {
        console.error('Error resetting vote count for all ideas:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
},

  resetVotesForIdea: async (req, res) => {
    const { ideaId } = req.params;

    try {
        // Delete user votes associated with the idea
        await pool.query('DELETE FROM user_votes WHERE idea_id = $1', [ideaId]);

        // Reset votes count for the specific idea
        await pool.query('UPDATE ideas SET votes = 0 WHERE id = $1', [ideaId]);
        res.status(200).json({ message: `Vote count reset successfully for idea with ID ${ideaId}` });
    } catch (error) {
        console.error(`Error resetting vote count for idea with ID ${ideaId}:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
},

};

module.exports = votingController;
