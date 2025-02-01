const express = require('express');
const pool = require('../../db');
const router = express.Router();

const MAX_IDEAS_PER_USER = 5;

router.post('/submitIdea', async (req, res) => {
  const { email, idea, description, technologies, event_id, is_built = false } = req.body;

  console.log('Received idea submission:', { email, idea, description, technologies, event_id, is_built });

  try {
    const eventCheckQuery = 'SELECT * FROM events WHERE id = $1';
    const eventCheckResult = await pool.query(eventCheckQuery, [event_id]);
    if (eventCheckResult.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const ideasCountQuery = 'SELECT COUNT(*) FROM ideas WHERE email = $1';
    const ideasCountResult = await pool.query(ideasCountQuery, [email]);
    const ideasCount = parseInt(ideasCountResult.rows[0].count, 10);

    if (ideasCount >= MAX_IDEAS_PER_USER) {
      return res.status(400).json({ message: `You can only submit up to ${MAX_IDEAS_PER_USER} ideas.` });
    }

    const insertQuery = `
      INSERT INTO ideas (email, idea, description, technologies, event_id, is_built)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `;
    const result = await pool.query(insertQuery, [email, idea, description, technologies, event_id, is_built]);

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

router.get('/allIdeas', async (req, res) => {
  try {
    const fetchQuery = 'SELECT * FROM ideas ORDER BY likes DESC, created_at DESC';  
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
  const { id } = req.params;
  const { idea, description, technologies } = req.body;

  console.log(`Editing idea ID ${id} with new data:`, { idea, description, technologies });

  try {
    const updateQuery = `
      UPDATE ideas
      SET idea = $1, description = $2, technologies = $3, updatedAt = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [idea, description, technologies, id]);

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

router.delete('/delete-idea/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  console.log('User attempting deletion:', email);

  try {
    // Check if the idea exists and fetch the owner's email
    const ideaResult = await pool.query('SELECT user_email FROM ideas WHERE id = $1', [id]);
    if (ideaResult.rowCount === 0) {
      return res.status(404).json({ message: 'Idea not found' });
    }
    const ideaOwnerEmail = ideaResult.rows[0].user_email;

    // Check if the email belongs to an admin
    const adminResult = await pool.query('SELECT email FROM admin WHERE email = $1', [email]);
    const isAdmin = adminResult.rowCount > 0;

    // Check if the user is either the owner or an admin
    if (email !== ideaOwnerEmail && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized: Only the owner or admins can delete this idea' });
    }

    // Proceed to delete the idea
    const result = await pool.query('DELETE FROM ideas WHERE id = $1 RETURNING *', [id]);
    res.json({ message: 'Idea deleted successfully', idea: result.rows[0] });
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ message: 'Failed to delete idea', error: error.message });
  }
});



// POST endpoint to like an idea
router.post('/like/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  const MAX_LIKES_PER_USER = 3;

  try {
    const likeCountQuery = 'SELECT COUNT(*) FROM likes WHERE user_email = $1';
    const likeCountResult = await pool.query(likeCountQuery, [email]);
    const totalLikes = parseInt(likeCountResult.rows[0].count, 10);

    if (totalLikes >= MAX_LIKES_PER_USER) {
      return res.status(400).json({ message: `You can only like up to ${MAX_LIKES_PER_USER} times.` });
    }

    const existingLikeQuery = 'SELECT * FROM likes WHERE user_email = $1 AND idea_id = $2';
    const existingLikeResult = await pool.query(existingLikeQuery, [email, id]);

    if (existingLikeResult.rows.length > 0) {
      return res.status(400).json({ message: 'You have already liked this idea.' });
    }

    const likeUpdateQuery = 'UPDATE ideas SET likes = likes + 1 WHERE id = $1 RETURNING *';
    const likeResult = await pool.query(likeUpdateQuery, [id]);

    const insertLikeQuery = 'INSERT INTO likes (user_email, idea_id) VALUES ($1, $2)';
    await pool.query(insertLikeQuery, [email, id]);

    console.log(`User ${email} liked idea ID ${id}`);

    res.status(200).json({
      message: 'Like recorded successfully!',
      idea: likeResult.rows[0]
    });
  } catch (error) {
    console.error('Error while liking:', error);
    res.status(500).json({ message: 'Failed to record like', error: error.message });
  }
});

// POST endpoint to unlike an idea
router.post('/unlike/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    const existingLikeQuery = 'SELECT * FROM likes WHERE user_email = $1 AND idea_id = $2';
    const existingLikeResult = await pool.query(existingLikeQuery, [email, id]);

    if (existingLikeResult.rows.length === 0) {
      return res.status(400).json({ message: 'You have not liked this idea.' });
    }

    const unlikeUpdateQuery = 'UPDATE ideas SET likes = likes - 1 WHERE id = $1 RETURNING *';
    const unlikeResult = await pool.query(unlikeUpdateQuery, [id]);

    const deleteLikeQuery = 'DELETE FROM likes WHERE user_email = $1 AND idea_id = $2';
    await pool.query(deleteLikeQuery, [email, id]);

    console.log(`User ${email} unliked idea ID ${id}`);

    res.status(200).json({
      message: 'Unlike recorded successfully!',
      idea: unlikeResult.rows[0]
    });
  } catch (error) {
    console.error('Error while unliking:', error);
    res.status(500).json({ message: 'Failed to record unlike', error: error.message });
  }
});

// GET endpoint to fetch the ideas a user has liked
router.get('/likedIdeas/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const likedIdeasQuery = 'SELECT idea_id FROM likes WHERE user_email = $1';
    const result = await pool.query(likedIdeasQuery, [email]);

    const likedIdeaIds = result.rows.map(row => row.idea_id);
    res.status(200).json({ likedIdeaIds });
  } catch (error) {
    console.error('Error fetching liked ideas:', error);
    res.status(500).json({ message: 'Failed to fetch liked ideas' });
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

// Endpoint to get user ideas with event titles and event_id
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const query = `
      SELECT ideas.id, ideas.idea, ideas.description, ideas.technologies, ideas.likes, ideas.created_at, 
             ideas.event_id,  -- Include event_id here
             events.title AS event_title, 
             ideas.is_built  -- Include is_built field
      FROM ideas
      INNER JOIN events ON ideas.event_id = events.id
      WHERE ideas.email = $1
      ORDER BY ideas.created_at DESC
    `;
    const result = await pool.query(query, [email]);
    res.status(200).json({ ideas: result.rows });
  } catch (error) {
    console.error('Error fetching user ideas:', error);
    res.status(500).json({ message: 'Failed to fetch user ideas' });
  }
});



// Endpoint to get liked ideas with event titles
router.get('/liked/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const query = `
      SELECT ideas.id, ideas.idea, ideas.description, ideas.technologies, ideas.likes, ideas.created_at, 
             events.title AS event_title
      FROM ideas
      INNER JOIN events ON ideas.event_id = events.id
      INNER JOIN likes ON ideas.id = likes.idea_id
      WHERE likes.user_email = $1
      ORDER BY ideas.created_at DESC
    `;
    const result = await pool.query(query, [email]);
    res.status(200).json({ ideas: result.rows });
  } catch (error) {
    console.error('Error fetching liked ideas:', error);
    res.status(500).json({ message: 'Failed to fetch liked ideas' });
  }
});

// PUT endpoint to set the stage of an idea
router.put('/set-stage/:id', async (req, res) => {
  const { id } = req.params;
  const { stage } = req.body; // Accept target stage from request body

  try {
    const updateQuery = `
      UPDATE ideas
      SET stage = $1
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [stage, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    console.log(`Idea stage updated successfully:`, result.rows[0]);

    res.status(200).json({
      message: 'Idea stage updated successfully!',
      idea: result.rows[0],
    });
  } catch (error) {
    console.error('Error setting stage:', error);
    res.status(500).json({ message: 'Failed to set stage', error: error.message });
  }
});

// GET endpoint to fetch a single idea by ID
router.get('/idea/:ideaId', async (req, res) => {
  const { ideaId } = req.params;

  try {
    const query = 'SELECT * FROM ideas WHERE id = $1';
    const result = await pool.query(query, [ideaId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    res.status(200).json({ idea: result.rows[0] });
  } catch (error) {
    console.error('Error fetching idea details:', error);
    res.status(500).json({ message: 'Failed to fetch idea details' });
  }
});

module.exports = router;
