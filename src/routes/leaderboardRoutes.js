const express = require("express");
const pool = require("../../db");
const router = express.Router();

// GET Leaderboard (Last 3 Hackathon Winners)
router.get("/leaderboard3winners", async (req, res) => {
  try {
    const leaderboardQuery = `
      SELECT 
        results.event_id, 
        events.event_date AS event_date, 
        results.category, 
        results.winning_idea_id, 
        results.votes, 
        ideas.idea AS idea_title, 
        ideas.description AS idea_description, 
        ideas.contributors 
      FROM results
      LEFT JOIN ideas ON results.winning_idea_id = ideas.id
      LEFT JOIN events ON results.event_id = events.id
      WHERE results.category = 'Hackathon Winner'
      ORDER BY events.event_date DESC 
      LIMIT 3;
    `;

    const { rows } = await pool.query(leaderboardQuery);

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



// GET Leaderboard (Contributors with Most Hackathon Wins)
router.get("/leaderboardMostWins", async (req, res) => {
  try {
    const leaderboardQuery = `
      SELECT 
        UNNEST(ideas.contributors) AS contributor,
        COUNT(results.winning_idea_id) AS total_wins
      FROM results
      LEFT JOIN ideas ON results.winning_idea_id = ideas.id
      WHERE results.category = 'Hackathon Winner'
      GROUP BY contributor
      ORDER BY total_wins DESC;
    `;

    // Fetch data
    let { rows } = await pool.query(leaderboardQuery);

    // Convert contributors field manually in case it's stored as text
    rows = rows.map(row => ({
      ...row,
      contributor: row.contributor.replace(/[\{\}]/g, ""), // Remove any { } if stored as text
    }));

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
