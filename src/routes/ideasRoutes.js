const express = require('express');
const pool = require('../../db');  // Import the existing pool configuration
const router = express.Router();

const MAX_IDEAS_PER_USER = 5;  // You can easily change this limit

router.post('/submitIdea', async (req, res) => {
  const { email, idea, description, technologies, event_id } = req.body;

  console.log('Received idea submission:', { email, idea, description, technologies, event_id });

  try {
    // Check if the event_id exists in the events table
    const eventCheckQuery = 'SELECT * FROM events WHERE id = $1';
    const eventCheckResult = await pool.query(eventCheckQuery, [event_id]);
    if (eventCheckResult.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    // Check how many ideas this user has already submitted
    const ideasCountQuery = 'SELECT COUNT(*) FROM ideas WHERE email = $1';
    const ideasCountResult = await pool.query(ideasCountQuery, [email]);
    const ideasCount = parseInt(ideasCountResult.rows[0].count, 10);

    if (ideasCount >= MAX_IDEAS_PER_USER) {
      return res.status(400).json({ message: `You can only submit up to ${MAX_IDEAS_PER_USER} ideas.` });
    }

    // Insert the new idea with the event_id
    const insertQuery = `
      INSERT INTO ideas (email, idea, description, technologies, event_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;
    const result = await pool.query(insertQuery, [email, idea, description, technologies, event_id]);

    console.log('Idea inserted successfully:', result.rows[0]);

    res.status(201).json({
      message: 'Idea submitted successfully!',
      idea: result.rows[0]
    });
  } catch (error) {
    console.error('Error while inserting idea:', error);
    res.status(500).json({ message: 'Failed to submit idea', error: error.message });
  }
});


// GET endpoint to fetch all ideas sorted by vote count
router.get('/allIdeas', async (req, res) => {
  try {
    // Fetch all ideas, including technologies, ordered by votes (descending) and created_at (descending for tie cases)
    const fetchQuery = 'SELECT * FROM ideas ORDER BY votes DESC, created_at DESC';  
    const result = await pool.query(fetchQuery);

    console.log('Fetched ideas:', result.rows);

    res.status(200).json({
      message: 'Ideas fetched successfully!',
      ideas: result.rows
    });
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ message: 'Failed to fetch ideas', error: error.message });
  }
});

// PUT endpoint to edit an existing idea
router.put('/editIdea/:id', async (req, res) => {
  const { id } = req.params;  // Get the idea ID from the request params
  const { idea, description, technologies } = req.body;  // Include technologies

  console.log(`Editing idea ID ${id} with new data:`, { idea, description, technologies });

  try {
    // Update the idea, description, and technologies, and set updatedAt only when updating the idea
    const updateQuery = `
      UPDATE ideas
      SET idea = $1, description = $2, technologies = $3, updatedAt = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [idea, description, technologies, id]);

    // If no rows were updated, the idea with the given ID does not exist
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    console.log('Idea updated successfully:', result.rows[0]);

    res.status(200).json({
      message: 'Idea updated successfully!',
      idea: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ message: 'Failed to update idea', error: error.message });
  }
});

// Delete Idea Endpoint
router.delete('/delete-idea/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM ideas WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Idea not found' });
    }
    res.json({ message: 'Idea deleted successfully', idea: result.rows[0] });
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ message: 'Failed to delete idea' });
  }
});

// POST endpoint to vote for an idea
router.post('/vote/:id', async (req, res) => {
  const { id } = req.params;  // Idea ID
  const { email } = req.body;  // User's email from request body
  const MAX_VOTES_PER_USER = 3;

  try {
    // Check how many times this user has voted
    const voteCountQuery = 'SELECT COUNT(*) FROM votes WHERE user_email = $1';
    const voteCountResult = await pool.query(voteCountQuery, [email]);
    const totalVotes = parseInt(voteCountResult.rows[0].count, 10);  // Total number of votes by the user

    if (totalVotes >= MAX_VOTES_PER_USER) {
      return res.status(400).json({ message: `You can only vote up to ${MAX_VOTES_PER_USER} times.` });
    }

    // Check if the user has already voted for this idea
    const existingVoteQuery = 'SELECT * FROM votes WHERE user_email = $1 AND idea_id = $2';
    const existingVoteResult = await pool.query(existingVoteQuery, [email, id]);

    if (existingVoteResult.rows.length > 0) {
      return res.status(400).json({ message: 'You have already voted for this idea.' });
    }

    // Increment the vote count for the idea
    const voteUpdateQuery = 'UPDATE ideas SET votes = votes + 1 WHERE id = $1 RETURNING *';
    const voteResult = await pool.query(voteUpdateQuery, [id]);

    // Insert the user's vote into the votes table
    const insertVoteQuery = 'INSERT INTO votes (user_email, idea_id) VALUES ($1, $2)';
    await pool.query(insertVoteQuery, [email, id]);

    console.log(`User ${email} voted for idea ID ${id}`);

    res.status(200).json({
      message: 'Vote recorded successfully!',
      idea: voteResult.rows[0]
    });
  } catch (error) {
    console.error('Error while voting:', error);
    res.status(500).json({ message: 'Failed to record vote', error: error.message });
  }
});

// POST endpoint to unvote an idea
router.post('/unvote/:id', async (req, res) => {
  const { id } = req.params;  // Idea ID
  const { email } = req.body;  // User's email from request body

  try {
    // Check if the user has voted for this idea
    const existingVoteQuery = 'SELECT * FROM votes WHERE user_email = $1 AND idea_id = $2';
    const existingVoteResult = await pool.query(existingVoteQuery, [email, id]);

    if (existingVoteResult.rows.length === 0) {
      return res.status(400).json({ message: 'You have not voted for this idea.' });
    }

    // Decrement the vote count for the idea
    const unvoteUpdateQuery = 'UPDATE ideas SET votes = votes - 1 WHERE id = $1 RETURNING *';
    const unvoteResult = await pool.query(unvoteUpdateQuery, [id]);

    // Remove the user's vote record
    const deleteVoteQuery = 'DELETE FROM votes WHERE user_email = $1 AND idea_id = $2';
    await pool.query(deleteVoteQuery, [email, id]);

    console.log(`User ${email} unvoted for idea ID ${id}`);

    res.status(200).json({
      message: 'Unvote recorded successfully!',
      idea: unvoteResult.rows[0]
    });
  } catch (error) {
    console.error('Error while unvoting:', error);
    res.status(500).json({ message: 'Failed to record unvote', error: error.message });
  }
});

// GET endpoint to fetch the ideas a user has voted for
router.get('/votedIdeas/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const votedIdeasQuery = 'SELECT idea_id FROM votes WHERE user_email = $1';
    const result = await pool.query(votedIdeasQuery, [email]);

    const votedIdeaIds = result.rows.map(row => row.idea_id);  // Extract idea IDs
    res.status(200).json({ votedIdeaIds });
  } catch (error) {
    console.error('Error fetching voted ideas:', error);
    res.status(500).json({ message: 'Failed to fetch voted ideas' });
  }
});

// GET ideas by event ID
router.get('/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM ideas WHERE event_id = $1', [eventId]);
    res.status(200).json({ ideas: result.rows });
  } catch (error) {
    console.error('Error fetching ideas for event:', error);
    res.status(500).json({ message: 'Failed to fetch ideas for event', error: error.message });
  }
});

router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query('SELECT * FROM ideas WHERE email = $1', [email]);
    res.status(200).json({ ideas: result.rows });
  } catch (error) {
    console.error('Error fetching user ideas:', error);
    res.status(500).json({ message: 'Failed to fetch user ideas' });
  }
});

router.get('/voted/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const query = `
      SELECT ideas.*
      FROM ideas
      INNER JOIN votes ON ideas.id = votes.idea_id
      WHERE votes.user_email = $1
    `;
    const result = await pool.query(query, [email]);
    res.status(200).json({ ideas: result.rows });
  } catch (error) {
    console.error('Error fetching voted ideas:', error);
    res.status(500).json({ message: 'Failed to fetch voted ideas' });
  }
});

module.exports = router;
