const express = require('express');
const pool = require('../../db');  // Import the existing pool configuration
const router = express.Router();

const MAX_IDEAS_PER_USER = 5;  // You can easily change this limit

router.post('/submitIdea', async (req, res) => {
  const { email, idea, description } = req.body;  // Now accepting description

  console.log('Received idea submission:', { email, idea, description });

  try {
    // Check how many ideas this user has already submitted
    const ideasCountQuery = 'SELECT COUNT(*) FROM ideas WHERE email = $1';
    const ideasCountResult = await pool.query(ideasCountQuery, [email]);
    const ideasCount = parseInt(ideasCountResult.rows[0].count, 10);  // Parse the count

    // If user has reached the limit
    if (ideasCount >= MAX_IDEAS_PER_USER) {
      return res.status(400).json({ message: `You can only submit up to ${MAX_IDEAS_PER_USER} ideas.` });
    }

    // Insert the new idea along with the description
    const insertQuery = 'INSERT INTO ideas (email, idea, description) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(insertQuery, [email, idea, description]);

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

// GET endpoint to fetch all ideas
router.get('/allIdeas', async (req, res) => {
  try {
    const fetchQuery = 'SELECT * FROM ideas ORDER BY created_at DESC';  // Fetch all ideas, ordered by creation date
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
  const { idea, description } = req.body;  // Get the new idea and description from the request body

  console.log(`Editing idea ID ${id} with new data:`, { idea, description });

  try {
    // Update the idea and description, and set updatedAt only when updating the idea
    const updateQuery = `
      UPDATE ideas
      SET idea = $1, description = $2, updatedAt = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [idea, description, id]);

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


module.exports = router;
