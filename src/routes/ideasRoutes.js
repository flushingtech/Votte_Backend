const express = require('express');
const pool = require('../../db');
const router = express.Router();

const MAX_IDEAS_PER_USER = 5;

router.post('/submitIdea', async (req, res) => {
  const { email, idea, description, technologies, event_id, is_built = false } = req.body;

  console.log('Received idea submission:', { email, idea, description, technologies, event_id, is_built });

  try {
    // Check if event exists
    const eventCheckQuery = 'SELECT * FROM events WHERE id = $1';
    const eventCheckResult = await pool.query(eventCheckQuery, [event_id]);
    if (eventCheckResult.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    // Count user's ideas for THIS specific event
    const ideasCountQuery = 'SELECT COUNT(*) FROM ideas WHERE email = $1 AND event_id = $2';
    const ideasCountResult = await pool.query(ideasCountQuery, [email, event_id]);
    const ideasCount = parseInt(ideasCountResult.rows[0].count, 10);

    if (ideasCount >= MAX_IDEAS_PER_USER) {
      return res.status(400).json({ message: `You can only submit up to ${MAX_IDEAS_PER_USER} ideas per event.` });
    }

    // Insert new idea
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

router.get('/previous-projects', async (req, res) => {
  try {
    const ideasQuery = `
SELECT 
  ideas.idea, 
  ideas.contributors, 
  events.title AS event_title,
  events.event_date
FROM ideas
JOIN events ON ideas.event_id = events.id
WHERE events.stage = 3
ORDER BY events.event_date DESC, ideas.created_at DESC;
    `;
    const { rows } = await pool.query(ideasQuery);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching previous projects:', error);
    res.status(500).json({ message: 'Failed to fetch previous projects' });
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
      SET idea = $1, description = $2, technologies = $3, updated_at = CURRENT_TIMESTAMP
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
  const { email } = req.query; // Get email from query params

  console.log('User attempting deletion:', email);

  try {
    // Check if the idea exists and fetch the owner's email
    const ideaResult = await pool.query('SELECT email FROM ideas WHERE id = $1', [id]); // Fix column name
    if (ideaResult.rowCount === 0) {
      return res.status(404).json({ message: 'Idea not found' });
    }
    const ideaOwnerEmail = ideaResult.rows[0].email;

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




router.post('/like/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    // Check if the user has already liked this idea
    const existingLikeQuery = 'SELECT * FROM likes WHERE user_email = $1 AND idea_id = $2';
    const existingLikeResult = await pool.query(existingLikeQuery, [email, id]);

    if (existingLikeResult.rows.length > 0) {
      return res.status(400).json({ message: 'You have already liked this idea.' });
    }

    // Update likes count in 'ideas' table
    const likeUpdateQuery = 'UPDATE ideas SET likes = likes + 1 WHERE id = $1 RETURNING *';
    const likeResult = await pool.query(likeUpdateQuery, [id]);

    // Insert like into 'likes' table
    const insertLikeQuery = 'INSERT INTO likes (user_email, idea_id) VALUES ($1, $2)';
    await pool.query(insertLikeQuery, [email, id]);

    console.log(`User ${email} liked idea ID ${id}`);

    res.status(200).json({
      message: 'Like recorded successfully!',
      idea: likeResult.rows[0],
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

router.get('/with-images', async (req, res) => {
  try {
    const query = `
      SELECT ideas.*, events.title AS event_title, events.event_date
      FROM ideas
      LEFT JOIN events ON ideas.event_id = events.id
      WHERE ideas.image_url IS NOT NULL
      ORDER BY ideas.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json({ ideas: result.rows });
  } catch (error) {
    console.error('Error fetching ideas with images:', error);
    res.status(500).json({ message: 'Failed to fetch ideas with images', error: error.message });
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
    const query = `
      SELECT ideas.*, events.title AS event_title, events.event_date
      FROM ideas
      LEFT JOIN events ON ideas.event_id = events.id
      WHERE ideas.id = $1
    `;
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


router.put('/:id/add-contributor', async (req, res) => {
  const { id } = req.params;
  const { contributor_email } = req.body;

  if (!contributor_email) {
    return res.status(400).json({ message: 'Missing contributor email' });
  }

  try {
    // Fetch existing contributors (stored as text)
    const ideaCheckQuery = 'SELECT contributors FROM ideas WHERE id = $1';
    const ideaCheckResult = await pool.query(ideaCheckQuery, [id]);

    if (ideaCheckResult.rowCount === 0) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    let existingContributors = ideaCheckResult.rows[0].contributors || '';

    // ✅ Remove any "{}" placeholder
    existingContributors = existingContributors.replace(/{}/g, '').trim();

    // ✅ Avoid duplicate emails
    const contributorsArray = existingContributors.length > 0 ? existingContributors.split(',') : [];
    if (contributorsArray.includes(contributor_email)) {
      return res.status(400).json({ message: 'Contributor already added' });
    }

    // ✅ Append the new email
    contributorsArray.push(contributor_email);
    const updatedContributors = contributorsArray.join(',');

    // ✅ Update the database
    const updateQuery = `
      UPDATE ideas 
      SET contributors = $1
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [updatedContributors, id]);

    res.status(200).json({
      message: 'Contributor added successfully!',
      idea: result.rows[0],
    });
  } catch (error) {
    console.error('Error adding contributor:', error);
    res.status(500).json({ message: 'Failed to add contributor', error: error.message });
  }
});

// GET endpoint to fetch ideas where the user is a contributor
router.get('/contributed/:email', async (req, res) => {
  const { email } = req.params;
  console.log(`📢 Fetching contributed ideas for: ${email}`);

  try {
    const query = `
      SELECT ideas.id, ideas.idea, ideas.description, ideas.technologies, ideas.likes, ideas.created_at, 
             events.title AS event_title, ideas.is_built, ideas.event_id
      FROM ideas
      INNER JOIN events ON ideas.event_id = events.id
      WHERE contributors LIKE '%' || $1 || '%'
      ORDER BY ideas.created_at DESC;
    `;

    console.log(`📢 Running query with email: ${email}`);
    const result = await pool.query(query, [email]);

    console.log(`✅ Contributed ideas found:`, result.rows);
    res.status(200).json({ ideas: result.rows });
  } catch (error) {
    console.error('❌ Error fetching contributed ideas:', error);
    res.status(500).json({ message: 'Failed to fetch contributed ideas', error: error.message });
  }
});

// GET total count of contributed ideas for a user
router.get('/contributed-count/:email', async (req, res) => {
  const { email } = req.params;

  console.log(`🔍 Received request for contributed count of user: ${email}`);

  try {
    const countQuery = `
      SELECT COUNT(*) 
      FROM ideas 
      WHERE contributors LIKE '%' || $1 || '%'
    `;

    console.log(`📊 Running query to count contributions for: ${email}`);
    const countResult = await pool.query(countQuery, [email]);

    const count = parseInt(countResult.rows[0].count, 10);

    console.log(`✅ Total contributions found for ${email}: ${count}`);

    res.status(200).json({ contributedCount: count });
  } catch (error) {
    console.error(`❌ Error fetching contributed count for ${email}:`, error.message);
    res.status(500).json({ message: 'Failed to fetch contributed count', error: error.message });
  }
});

// GET total hackathon wins (including contributed ideas)
router.get('/hackathon-wins/:email', async (req, res) => {
  const { email } = req.params;

  console.log(`🏆 Fetching Hackathon Wins for user: ${email}`);

  try {
    const query = `
      SELECT COUNT(*) AS total_wins
      FROM results r
      JOIN ideas i ON r.winning_idea_id = i.id
      WHERE r.category = 'Hackathon Winner'
      AND (i.email = $1 OR i.contributors LIKE '%' || $1 || '%');
    `;

    const result = await pool.query(query, [email]);
    const wins = parseInt(result.rows[0].total_wins, 10);

    console.log(`✅ Total Hackathon Wins for ${email}: ${wins}`);

    res.status(200).json({ totalWins: wins });
  } catch (error) {
    console.error(`❌ Error fetching Hackathon Wins for ${email}:`, error.message);
    res.status(500).json({ message: 'Failed to fetch hackathon wins', error: error.message });
  }
});

// GET detailed hackathon wins (with event title and date)
router.get('/hackathon-wins-details/:email', async (req, res) => {
  const { email } = req.params;

  console.log(`📜 Fetching detailed Hackathon Wins for: ${email}`);

  try {
    const query = `
      SELECT e.id AS event_id, e.title AS event_title, e.event_date
      FROM results r
      JOIN ideas i ON r.winning_idea_id = i.id
      JOIN events e ON r.event_id = e.id
      WHERE r.category = 'Hackathon Winner'
      AND (i.email = $1 OR i.contributors LIKE '%' || $1 || '%')
      ORDER BY e.event_date DESC;
    `;

    const result = await pool.query(query, [email]);

    console.log(`✅ Hackathon wins fetched for ${email}:`, result.rows);

    res.status(200).json({ wins: result.rows });
  } catch (error) {
    console.error(`❌ Error fetching detailed wins for ${email}:`, error.message);
    res.status(500).json({ message: 'Failed to fetch hackathon win details', error: error.message });
  }
});


module.exports = router;
