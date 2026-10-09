const express = require('express');
const pool = require('../../db'); // Database connection
const { MEMBER_WEIGHT_CTE } = require('../utils/voteWeighting');
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
  const { vote_type, event_id } = req.query; // Optional filters by vote type and event

  try {
    let fetchVotesQuery = `SELECT * FROM votes WHERE idea_id = $1`;
    let queryParams = [idea_id];

    if (event_id) {
      fetchVotesQuery += ` AND event_id = $${queryParams.length + 1}`;
      queryParams.push(event_id);
    }

    if (vote_type) {
      fetchVotesQuery += ` AND vote_type = $${queryParams.length + 1}`;
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


// Get all votes for an idea (with optional event filter)
router.get('/idea/:idea_id', async (req, res) => {
  const { idea_id } = req.params;
  const { event_id } = req.query;

  try {
    let fetchVotesQuery = `SELECT * FROM votes WHERE idea_id = $1`;
    let queryParams = [idea_id];

    if (event_id) {
      fetchVotesQuery += ` AND event_id = $2`;
      queryParams.push(event_id);
    }

    const result = await pool.query(fetchVotesQuery, queryParams);
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

// Function to determine and store winners in the results table
const determineWinners = async (event_id) => {
  try {
    console.log(`Determining winners for event ${event_id}...`);

    const categories = ["Most Creative", "Most Technical", "Most Impactful"];

    // Shared by every category and the overall tally below: finds every idea
    // tied for the top weighted vote total (see voteWeighting.js), not just
    // one. Rounded to 2 decimals before comparing so floating-point noise
    // (e.g. 1/3 three times not landing on exactly 1.0) doesn't split a real
    // tie into "winners" and "near-winners".
    const topTiedQuery = (voteTypeFilter) => `
      WITH ${MEMBER_WEIGHT_CTE},
      weighted AS (
        SELECT
          v.idea_id,
          ROUND(SUM(1.0 / COALESCE(mw.team_size, 1))::numeric, 2) AS weighted_votes
        FROM votes v
        LEFT JOIN member_weights mw ON mw.email = v.user_email
        WHERE v.event_id = $1::integer ${voteTypeFilter ? "AND v.vote_type = $2" : ""}
        GROUP BY v.idea_id
      ),
      max_votes AS (
        SELECT MAX(weighted_votes) AS max_weighted FROM weighted
      )
      SELECT idea_id, weighted_votes
      FROM weighted, max_votes
      WHERE weighted_votes = max_votes.max_weighted;
    `;

    // Every visitor's browser calls determineWinners when Stage 3 mounts, so
    // concurrent calls are routine, not an edge case. Upsert-then-prune (both
    // steps idempotent) instead of delete-then-insert, so two overlapping
    // calls converge on the same correct state instead of racing each other
    // into a duplicate-key error.
    const syncCategoryWinners = async (category, rows) => {
      for (const { idea_id, weighted_votes } of rows) {
        const votes = Math.round(Number(weighted_votes));
        await pool.query(
          `INSERT INTO results (event_id, category, winning_idea_id, votes)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (event_id, category, winning_idea_id)
           DO UPDATE SET votes = $4, created_at = NOW()`,
          [event_id, category, idea_id, votes]
        );
      }

      const ideaIds = rows.map((r) => r.idea_id);
      if (ideaIds.length > 0) {
        // Prune anyone who was a winner before but lost the tie this time.
        await pool.query(
          `DELETE FROM results WHERE event_id = $1 AND category = $2 AND NOT (winning_idea_id = ANY($3::integer[]))`,
          [event_id, category, ideaIds]
        );
      } else {
        await pool.query(`DELETE FROM results WHERE event_id = $1 AND category = $2`, [event_id, category]);
      }
    };

    for (const category of categories) {
      const { rows } = await pool.query(topTiedQuery(true), [event_id, category]);
      await syncCategoryWinners(category, rows);

      if (rows.length === 0) {
        console.log(`No votes found for ${category}`);
      } else {
        const ideaIds = rows.map((r) => r.idea_id).join(', ');
        console.log(`Winner(s) for ${category}: Idea(s) ${ideaIds}${rows.length > 1 ? ' (tied)' : ''}.`);
      }
    }

    // Determine Hackathon Winner(s) (previously Best Overall) — same tie handling, across all vote types.
    const { rows: bestOverallRows } = await pool.query(topTiedQuery(false), [event_id]);
    await syncCategoryWinners('Hackathon Winner', bestOverallRows);

    if (bestOverallRows.length > 0) {
      const ideaIds = bestOverallRows.map((r) => r.idea_id).join(', ');
      console.log(`Hackathon Winner(s): Idea(s) ${ideaIds}${bestOverallRows.length > 1 ? ' (tied)' : ''}.`);
    }

    console.log(`Winners determined successfully for event ${event_id}.`);
    return { message: "Winners determined successfully." };

  } catch (error) {
    console.error("Error determining winners:", error);
    throw error;
  }
};


router.post('/determine-winners', async (req, res) => {
  const { event_id } = req.body;

  if (!event_id) {
    return res.status(400).json({ message: 'Missing event_id' });
  }

  try {
    const result = await determineWinners(event_id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to determine winners.', error: error.message });
  }
});

router.get('/results', async (req, res) => {
  const { event_id } = req.query;

  if (!event_id) {
    return res.status(400).json({ message: 'Missing event_id' });
  }

  try {
    const resultQuery = `
      SELECT
        r.id,
        r.category,
        r.winning_idea_id,
        r.votes,
        i.idea AS idea_title,
        i.description AS idea_description
      FROM results r
      JOIN ideas i ON r.winning_idea_id = i.id
      WHERE r.event_id = $1
      ORDER BY r.category, r.winning_idea_id;
    `;

    const { rows } = await pool.query(resultQuery, [event_id]);

    res.status(200).json({ results: rows });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ message: 'Failed to fetch results.' });
  }
});

// GET total number of votes a user has received across all ideas (authored + contributed)
router.get('/total-votes/:email', async (req, res) => {
  const { email } = req.params;

  console.log(`🔍 Counting total votes for user: ${email}`);

  try {
    const totalVotesQuery = `
      SELECT COUNT(*) AS total_votes
      FROM votes v
      JOIN ideas i ON v.idea_id = i.id
      WHERE i.email = $1 OR i.contributors LIKE '%' || $1 || '%'
    `;

    const result = await pool.query(totalVotesQuery, [email]);
    const totalVotes = parseInt(result.rows[0].total_votes, 10);

    console.log(`✅ Total votes received by ${email}: ${totalVotes}`);

    res.status(200).json({ totalVotes });
  } catch (error) {
    console.error(`❌ Error fetching total votes for ${email}:`, error.message);
    res.status(500).json({ message: 'Failed to fetch total votes', error: error.message });
  }
});


module.exports = router;