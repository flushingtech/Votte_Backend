const express = require("express");
const pool = require("../../db");
const router = express.Router();

// GET Leaderboard (Hackathon Winners)
router.get("/leaderboard", async (req, res) => {
  try {
    // Get limit from query parameters, default to 3 if not provided
    const limit = parseInt(req.query.limit) || 3;

    const leaderboardQuery = `
      SELECT 
        results.event_id, 
        results.category, 
        results.winning_idea_id, 
        results.votes, 
        ideas.idea AS idea_title, 
        ideas.description AS idea_description, 
        ideas.contributors 
      FROM results
      LEFT JOIN ideas ON results.winning_idea_id = ideas.id
      WHERE results.category = 'Hackathon Winner'
      ORDER BY results.votes DESC
      LIMIT $1;  -- Use parameterized query for security
    `;

    const { rows } = await pool.query(leaderboardQuery, [limit]);

    res.status(200).json({
      success: true,
      leaderboard: rows,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard.",
      error: error.message,
    });
  }
});


module.exports = router;
