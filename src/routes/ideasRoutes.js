const express = require('express');
const pool = require('../../db');
const router = express.Router();

const MAX_IDEAS_PER_USER = 5;

router.post('/submitIdea', async (req, res) => {
  const { email, idea, description, technologies, event_id, is_built = false, github_repos } = req.body;

  // Convert github_repos array to JSON string for storage
  const github_repo = github_repos ? JSON.stringify(github_repos) : null;

  console.log('Received idea submission:', { email, idea, description, technologies, event_id, is_built, github_repos });

  try {
    // Check if event exists
    const eventCheckQuery = 'SELECT * FROM events WHERE id = $1';
    const eventCheckResult = await pool.query(eventCheckQuery, [event_id]);
    if (eventCheckResult.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    // Check if user is an admin
    const adminCheckQuery = 'SELECT * FROM admin WHERE email = $1';
    const adminCheckResult = await pool.query(adminCheckQuery, [email]);
    const isAdmin = adminCheckResult.rowCount > 0;

    // Only enforce limit for non-admin users
    if (!isAdmin) {
      // Count user's ideas for THIS specific event
      const ideasCountQuery = 'SELECT COUNT(*) FROM ideas WHERE email = $1 AND event_id = $2';
      const ideasCountResult = await pool.query(ideasCountQuery, [email, event_id]);
      const ideasCount = parseInt(ideasCountResult.rows[0].count, 10);

      if (ideasCount >= MAX_IDEAS_PER_USER) {
        return res.status(400).json({ message: `You can only submit up to ${MAX_IDEAS_PER_USER} ideas per event.` });
      }
    }

    // Insert new idea - only in ideas table for first event
    const insertQuery = `
      INSERT INTO ideas (email, idea, description, technologies, event_id, is_built, github_repo)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `;
    const result = await pool.query(insertQuery, [email, idea, description, technologies, event_id, is_built, github_repo]);

    const newIdea = result.rows[0];

    console.log('Idea inserted successfully:', newIdea);

    res.status(201).json({
      message: 'Idea submitted successfully!',
      idea: newIdea
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
        ideas.id,
        ideas.idea,
        ideas.contributors,
        events.title AS event_title,
        events.event_date
      FROM ideas
      JOIN events ON ideas.event_id = events.id::text
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

router.get('/archived-projects', async (req, res) => {
  try {
    const ideasQuery = `
      SELECT
        ideas.id,
        ideas.idea,
        ideas.contributors,
        ideas.technologies,
        ideas.is_built,
        events.title AS event_title,
        events.event_date
      FROM ideas
      JOIN events ON ideas.event_id = events.id::text
      WHERE events.stage = 3 AND (ideas.stage IS NULL OR ideas.stage = 1)
      ORDER BY events.event_date DESC, ideas.created_at DESC;
    `;
    const { rows } = await pool.query(ideasQuery);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching archived projects:', error);
    res.status(500).json({ message: 'Failed to fetch archived projects' });
  }
});


router.put("/add-event-to-idea/:id", async (req, res) => {
  const ideaId = req.params.id;
  const { event_id, description, technologies, is_built } = req.body;

  try {
    const ideaResult = await pool.query("SELECT * FROM ideas WHERE id = $1", [ideaId]);

    if (ideaResult.rows.length === 0) {
      return res.status(404).json({ message: "Idea not found" });
    }

    const idea = ideaResult.rows[0];
    let existingEventIds = idea.event_id || "";
    let updatedEventIds = existingEventIds
      ? existingEventIds.split(",").map(id => id.trim())
      : [];

    if (!updatedEventIds.includes(String(event_id))) {
      updatedEventIds.push(String(event_id));
    }

    const newEventIdString = updatedEventIds.join(",");

    await pool.query("UPDATE ideas SET event_id = $1 WHERE id = $2", [
      newEventIdString,
      ideaId,
    ]);

    // Create event-specific metadata entry
    // Require event-specific description - no fallback to main idea values
    if (!description) {
      return res.status(400).json({
        message: "Event-specific description is required when adding an idea to a new event"
      });
    }

    const metadataInsertQuery = `
      INSERT INTO idea_event_metadata (idea_id, event_id, description, technologies, contributors, is_built)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (idea_id, event_id) DO UPDATE SET
        description = EXCLUDED.description,
        technologies = EXCLUDED.technologies,
        is_built = EXCLUDED.is_built
    `;
    await pool.query(metadataInsertQuery, [
      ideaId,
      event_id,
      description,
      technologies || idea.technologies, // can reuse tech stack if not provided
      '', // empty contributors for new event
      is_built !== undefined ? is_built : false
    ]);

    res.status(200).json({ message: "Event added to idea successfully with metadata" });
  } catch (error) {
    console.error("Error adding event to idea:", error);
    res.status(500).json({ message: "Failed to add event to idea" });
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
  const { idea, description, technologies, github_repos } = req.body;

  // Convert github_repos array to JSON string for storage
  const github_repo = github_repos ? JSON.stringify(github_repos) : null;

  console.log(`Editing idea ID ${id} with new data:`, { idea, description, technologies, github_repos });

  try {
    const updateQuery = `
      UPDATE ideas
      SET idea = $1, description = $2, technologies = $3, github_repo = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [idea, description, technologies, github_repo, id]);

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
      LEFT JOIN events ON (',' || ideas.event_id || ',') LIKE '%,' || events.id::text || ',%'
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


// GET ideas by event ID with event-specific metadata and vote counts
router.get('/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    const query = `
      SELECT
        i.*,
        COALESCE(m.description, i.description) as description,
        COALESCE(m.technologies, i.technologies) as technologies,
        COALESCE(m.contributors, i.contributors) as contributors,
        COALESCE(m.is_built, i.is_built) as is_built,
        COALESCE(vote_counts.total_votes, 0) as votes,
        COALESCE(vote_counts.most_creative_votes, 0) as most_creative_votes,
        COALESCE(vote_counts.most_technical_votes, 0) as most_technical_votes,
        COALESCE(vote_counts.most_impactful_votes, 0) as most_impactful_votes
      FROM ideas i
      LEFT JOIN idea_event_metadata m
        ON i.id = m.idea_id AND m.event_id = $1
      LEFT JOIN (
        SELECT
          idea_id,
          COUNT(*) as total_votes,
          COUNT(*) FILTER (WHERE vote_type = 'Most Creative') as most_creative_votes,
          COUNT(*) FILTER (WHERE vote_type = 'Most Technical') as most_technical_votes,
          COUNT(*) FILTER (WHERE vote_type = 'Most Impactful') as most_impactful_votes
        FROM votes
        WHERE event_id = $1
        GROUP BY idea_id
      ) vote_counts ON i.id = vote_counts.idea_id
      WHERE (',' || i.event_id || ',') LIKE '%,' || $1 || ',%'
    `;
    const result = await pool.query(query, [eventId]);
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
             ideas.event_id,
             events.title AS event_title, 
             ideas.is_built
      FROM ideas
      INNER JOIN events ON (',' || ideas.event_id || ',') LIKE '%,' || events.id::text || ',%'
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
      INNER JOIN events ON (',' || ideas.event_id || ',') LIKE '%,' || events.id::text || ',%'
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

// GET endpoint to fetch a single idea by ID (with support for multiple event_ids and event-specific metadata)
router.get('/idea/:ideaId', async (req, res) => {
  const { ideaId } = req.params;

  try {
    // Fetch the idea first
    const ideaQuery = `SELECT * FROM ideas WHERE id = $1`;
    const ideaResult = await pool.query(ideaQuery, [ideaId]);

    if (ideaResult.rowCount === 0) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    const idea = ideaResult.rows[0];

    // Parse event_ids and fetch related events with event-specific metadata
    // Try with image_url, if column doesn't exist yet, catch and retry without it
    let eventResult;
    try {
      const eventQuery = `
        SELECT
          e.id as event_id,
          e.title,
          e.event_date,
          COALESCE(m.description, $2) as description,
          COALESCE(m.technologies, $3) as technologies,
          COALESCE(m.is_built, $4) as is_built,
          CASE
            WHEN m.id IS NULL THEN $5
            ELSE m.contributors
          END as contributors,
          CASE
            WHEN m.id IS NULL THEN $6
            ELSE m.image_url
          END as image_url,
          COALESCE(vote_counts.total_votes, 0) as votes,
          COALESCE(vote_counts.most_creative_votes, 0) as most_creative_votes,
          COALESCE(vote_counts.most_technical_votes, 0) as most_technical_votes,
          COALESCE(vote_counts.most_impactful_votes, 0) as most_impactful_votes,
          COALESCE(
            (
              SELECT json_agg(category)
              FROM results
              WHERE event_id = e.id AND winning_idea_id = $1
            ),
            '[]'::json
          ) as awards
        FROM events e
        LEFT JOIN idea_event_metadata m
          ON e.id = m.event_id AND m.idea_id = $1
        LEFT JOIN (
          SELECT
            event_id,
            COUNT(*) as total_votes,
            COUNT(*) FILTER (WHERE vote_type = 'Most Creative') as most_creative_votes,
            COUNT(*) FILTER (WHERE vote_type = 'Most Technical') as most_technical_votes,
            COUNT(*) FILTER (WHERE vote_type = 'Most Impactful') as most_impactful_votes
          FROM votes
          WHERE idea_id = $1
          GROUP BY event_id
        ) vote_counts ON e.id = vote_counts.event_id
        WHERE e.id = ANY (string_to_array($7, ',')::int[])
        ORDER BY e.event_date ASC
      `;
      eventResult = await pool.query(eventQuery, [
        ideaId,
        idea.description,
        idea.technologies,
        idea.is_built,
        idea.contributors || '',
        idea.image_url || null,
        idea.event_id
      ]);
    } catch (err) {
      console.error('Error with image_url column, falling back to query without it:', err.message);
      // Fallback query without image_url column (for backwards compatibility)
      const eventQueryFallback = `
        SELECT
          e.id as event_id,
          e.title,
          e.event_date,
          COALESCE(m.description, $2) as description,
          COALESCE(m.technologies, $3) as technologies,
          COALESCE(m.is_built, $4) as is_built,
          CASE
            WHEN m.id IS NULL THEN $5
            ELSE m.contributors
          END as contributors,
          CASE
            WHEN m.id IS NULL THEN $6
            ELSE NULL
          END as image_url,
          COALESCE(vote_counts.total_votes, 0) as votes,
          COALESCE(vote_counts.most_creative_votes, 0) as most_creative_votes,
          COALESCE(vote_counts.most_technical_votes, 0) as most_technical_votes,
          COALESCE(vote_counts.most_impactful_votes, 0) as most_impactful_votes,
          COALESCE(
            (
              SELECT json_agg(category)
              FROM results
              WHERE event_id = e.id AND winning_idea_id = $1
            ),
            '[]'::json
          ) as awards
        FROM events e
        LEFT JOIN idea_event_metadata m
          ON e.id = m.event_id AND m.idea_id = $1
        LEFT JOIN (
          SELECT
            event_id,
            COUNT(*) as total_votes,
            COUNT(*) FILTER (WHERE vote_type = 'Most Creative') as most_creative_votes,
            COUNT(*) FILTER (WHERE vote_type = 'Most Technical') as most_technical_votes,
            COUNT(*) FILTER (WHERE vote_type = 'Most Impactful') as most_impactful_votes
          FROM votes
          WHERE idea_id = $1
          GROUP BY event_id
        ) vote_counts ON e.id = vote_counts.event_id
        WHERE e.id = ANY (string_to_array($7, ',')::int[])
        ORDER BY e.event_date ASC
      `;
      eventResult = await pool.query(eventQueryFallback, [
        ideaId,
        idea.description,
        idea.technologies,
        idea.is_built,
        idea.contributors || '',
        idea.image_url || null,
        idea.event_id
      ]);
    }

    idea.events = eventResult.rows;

    res.status(200).json({ idea });
  } catch (error) {
    console.error('Error fetching idea details:', error);
    res.status(500).json({ message: 'Failed to fetch idea details' });
  }
});



// PUT endpoint to update event-specific metadata
router.put('/update-event-metadata/:ideaId/:eventId', async (req, res) => {
  const { ideaId, eventId } = req.params;
  const { description, technologies } = req.body;

  if (!description) {
    return res.status(400).json({ message: 'Description is required' });
  }

  try {
    // Check if this is the first event (no metadata entry exists)
    const metadataCheck = await pool.query(
      'SELECT * FROM idea_event_metadata WHERE idea_id = $1 AND event_id = $2',
      [ideaId, eventId]
    );

    if (metadataCheck.rowCount === 0) {
      // This is the first event - update the main ideas table
      await pool.query(
        'UPDATE ideas SET description = $1, technologies = $2 WHERE id = $3',
        [description, technologies, ideaId]
      );
    } else {
      // This is an additional event - update the metadata table
      await pool.query(
        'UPDATE idea_event_metadata SET description = $1, technologies = $2 WHERE idea_id = $3 AND event_id = $4',
        [description, technologies, ideaId, eventId]
      );
    }

    res.status(200).json({ message: 'Updated successfully' });
  } catch (error) {
    console.error('Error updating event metadata:', error);
    res.status(500).json({ message: 'Failed to update event metadata' });
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

// PUT endpoint to add contributor per event
router.put('/:ideaId/add-contributor-event/:eventId', async (req, res) => {
  const { ideaId, eventId } = req.params;
  const { contributor_email } = req.body;

  if (!contributor_email) {
    return res.status(400).json({ message: 'Missing contributor email' });
  }

  try {
    // Check if metadata exists for this idea+event combination
    const metadataCheck = await pool.query(
      'SELECT contributors FROM idea_event_metadata WHERE idea_id = $1 AND event_id = $2',
      [ideaId, eventId]
    );

    let contributorsArray = [];
    let existingContributors = '';

    if (metadataCheck.rowCount === 0) {
      // First event - get from ideas table
      const ideaCheck = await pool.query('SELECT contributors FROM ideas WHERE id = $1', [ideaId]);
      if (ideaCheck.rowCount === 0) {
        return res.status(404).json({ message: 'Idea not found' });
      }
      existingContributors = ideaCheck.rows[0].contributors || '';
    } else {
      // Additional event - get from metadata table
      existingContributors = metadataCheck.rows[0].contributors || '';
    }

    // Remove any "{}" placeholder and parse existing contributors
    existingContributors = existingContributors.replace(/{}/g, '').trim();
    contributorsArray = existingContributors.length > 0 ? existingContributors.split(',').map(c => c.trim()) : [];

    // Check for duplicates
    if (contributorsArray.includes(contributor_email)) {
      return res.status(400).json({ message: 'Contributor already added' });
    }

    // Add new contributor
    contributorsArray.push(contributor_email);
    const updatedContributors = contributorsArray.join(',');

    // Update the appropriate table
    if (metadataCheck.rowCount === 0) {
      // First event - update ideas table
      await pool.query(
        'UPDATE ideas SET contributors = $1 WHERE id = $2',
        [updatedContributors, ideaId]
      );
    } else {
      // Additional event - update metadata table
      await pool.query(
        'UPDATE idea_event_metadata SET contributors = $1 WHERE idea_id = $2 AND event_id = $3',
        [updatedContributors, ideaId, eventId]
      );
    }

    res.status(200).json({
      message: 'Contributor added successfully!',
      contributors: updatedContributors
    });
  } catch (error) {
    console.error('Error adding contributor to event:', error);
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
      INNER JOIN events ON (',' || ideas.event_id || ',') LIKE '%,' || events.id::text || ',%'
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

router.delete('/idea/:id/:eventId', async (req, res) => {
  const { id, eventId } = req.params;
  const { email } = req.query;

  try {
    // Optionally validate email is admin
    const adminCheck = await pool.query('SELECT * FROM admin WHERE email = $1', [email]);
    if (adminCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Not authorized to delete idea' });
    }

    const ideaQuery = 'SELECT event_id FROM ideas WHERE id = $1';
    const ideaResult = await pool.query(ideaQuery, [id]);

    if (ideaResult.rowCount === 0) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    const currentEventIds = ideaResult.rows[0].event_id;

    const eventIdsArray = currentEventIds
      .split(',')
      .map(eid => eid.trim())
      .filter(eid => eid);

    const updatedEventIds = eventIdsArray.filter(eid => eid !== eventId);

    if (updatedEventIds.length === 0) {
      await pool.query('DELETE FROM ideas WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Idea deleted entirely (no more events)' });
    } else {
      await pool.query(
        'UPDATE ideas SET event_id = $1 WHERE id = $2',
        [updatedEventIds.join(','), id]
      );
      return res.status(200).json({ message: 'Removed event from idea, idea still exists' });
    }
  } catch (error) {
    console.error('Error removing event from idea:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Admin endpoint to find potential duplicate ideas
router.get('/admin/duplicates', async (req, res) => {
  try {
    // Get all ideas with their event info
    const ideasQuery = `
      SELECT
        i.id,
        i.idea,
        i.email,
        i.event_id,
        i.description,
        i.technologies,
        i.contributors,
        i.likes,
        e.event_date,
        e.title as event_title
      FROM ideas i
      LEFT JOIN events e ON e.id = ANY(string_to_array(i.event_id, ',')::int[])
      ORDER BY i.idea, e.event_date ASC
    `;

    const result = await pool.query(ideasQuery);
    const ideas = result.rows;

    // Group ideas by similar titles using simple string similarity
    const duplicateGroups = [];
    const processedIds = new Set();

    for (let i = 0; i < ideas.length; i++) {
      if (processedIds.has(ideas[i].id)) continue;

      const group = [ideas[i]];
      processedIds.add(ideas[i].id);

      // Find similar ideas
      for (let j = i + 1; j < ideas.length; j++) {
        if (processedIds.has(ideas[j].id)) continue;

        // Check if titles are similar (case-insensitive, normalize whitespace)
        const title1 = ideas[i].idea.toLowerCase().trim().replace(/\s+/g, ' ');
        const title2 = ideas[j].idea.toLowerCase().trim().replace(/\s+/g, ' ');

        // Simple similarity: exact match or very similar
        if (title1 === title2 ||
            title1.includes(title2) ||
            title2.includes(title1) ||
            calculateSimilarity(title1, title2) > 0.7) {
          group.push(ideas[j]);
          processedIds.add(ideas[j].id);
        }
      }

      // Only include groups with 2+ ideas
      if (group.length > 1) {
        duplicateGroups.push({
          title: group[0].idea,
          count: group.length,
          ideas: group
        });
      }
    }

    res.json({ duplicateGroups });
  } catch (error) {
    console.error('Error finding duplicates:', error);
    res.status(500).json({ message: 'Failed to find duplicates' });
  }
});

// Helper function for string similarity (Dice's coefficient)
function calculateSimilarity(str1, str2) {
  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);

  const intersection = bigrams1.filter(bg => bigrams2.includes(bg)).length;
  return (2 * intersection) / (bigrams1.length + bigrams2.length);
}

function getBigrams(str) {
  const bigrams = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.substring(i, i + 2));
  }
  return bigrams;
}

// Admin endpoint to merge ideas
router.post('/admin/merge-ideas', async (req, res) => {
  const { ideaIds, adminEmail } = req.body;

  try {
    // Verify admin
    const adminCheck = await pool.query('SELECT * FROM admin WHERE email = $1', [adminEmail]);
    if (adminCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!ideaIds || ideaIds.length < 2) {
      return res.status(400).json({ message: 'Need at least 2 ideas to merge' });
    }

    // Fetch all ideas to merge with their earliest event date
    const ideasQuery = `
      SELECT DISTINCT ON (i.id) i.*,
        (SELECT MIN(e.event_date)
         FROM events e
         WHERE e.id = ANY(string_to_array(i.event_id, ',')::int[])) as earliest_event_date
      FROM ideas i
      WHERE i.id = ANY($1)
      ORDER BY i.id
    `;
    const ideasResult = await pool.query(ideasQuery, [ideaIds]);
    let ideas = ideasResult.rows;

    if (ideas.length < 2) {
      return res.status(400).json({ message: 'Not enough ideas found to merge' });
    }

    // Sort by earliest event date to find primary
    ideas.sort((a, b) => {
      if (!a.earliest_event_date) return 1;
      if (!b.earliest_event_date) return -1;
      return new Date(a.earliest_event_date) - new Date(b.earliest_event_date);
    });

    // The primary idea is the one with the earliest event date
    const primaryIdea = ideas[0];
    const otherIdeas = ideas.slice(1);

    console.log('Merging ideas:', {
      primary: primaryIdea.id,
      others: otherIdeas.map(i => i.id)
    });

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Collect all unique event IDs
      const allEventIds = new Set();
      ideas.forEach(idea => {
        idea.event_id.split(',').forEach(eid => allEventIds.add(eid.trim()));
      });

      // Update primary idea's event_id to include all events
      const newEventIdString = Array.from(allEventIds).join(',');
      await pool.query(
        'UPDATE ideas SET event_id = $1 WHERE id = $2',
        [newEventIdString, primaryIdea.id]
      );

      // For each other idea, create idea_event_metadata entries
      for (const idea of otherIdeas) {
        const eventIds = idea.event_id.split(',').map(eid => eid.trim());

        for (const eventId of eventIds) {
          // Create metadata entry
          await pool.query(`
            INSERT INTO idea_event_metadata (idea_id, event_id, description, technologies, contributors, is_built, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (idea_id, event_id) DO UPDATE SET
              description = EXCLUDED.description,
              technologies = EXCLUDED.technologies,
              contributors = EXCLUDED.contributors,
              is_built = EXCLUDED.is_built,
              image_url = EXCLUDED.image_url
          `, [
            primaryIdea.id,
            eventId,
            idea.description,
            idea.technologies,
            idea.contributors || '',
            idea.is_built || false,
            idea.image_url || null
          ]);

          // Migrate votes to the new idea
          await pool.query(
            'UPDATE votes SET idea_id = $1 WHERE idea_id = $2 AND event_id = $3',
            [primaryIdea.id, idea.id, eventId]
          );

          // Migrate results/awards
          await pool.query(
            'UPDATE results SET winning_idea_id = $1 WHERE winning_idea_id = $2 AND event_id = $3',
            [primaryIdea.id, idea.id, eventId]
          );
        }

        // Migrate likes (they're not event-specific)
        await pool.query(
          'UPDATE likes SET idea_id = $1 WHERE idea_id = $2',
          [primaryIdea.id, idea.id]
        );

        // Update like count on primary idea
        const likeCountResult = await pool.query(
          'SELECT COUNT(*) FROM likes WHERE idea_id = $1',
          [primaryIdea.id]
        );
        await pool.query(
          'UPDATE ideas SET likes = $1 WHERE id = $2',
          [likeCountResult.rows[0].count, primaryIdea.id]
        );

        // Delete the duplicate idea
        await pool.query('DELETE FROM ideas WHERE id = $1', [idea.id]);
      }

      await pool.query('COMMIT');

      res.json({
        message: 'Ideas merged successfully',
        primaryIdeaId: primaryIdea.id,
        mergedCount: otherIdeas.length
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Transaction error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error merging ideas:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Failed to merge ideas',
      error: error.message,
      detail: error.detail || error.toString()
    });
  }
});

module.exports = router;
