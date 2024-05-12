const pool = require('../db');

// Controller functions for ideas
const ideasController = {
  getAllIdeas: async (req, res) => {
    try {
      const ideas = await pool.query('SELECT * FROM ideas ORDER BY id DESC');
      res.status(200).json(ideas.rows);
    } catch (error) {
      console.error('Error fetching ideas:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  addIdea: async (req, res) => {
    const { text } = req.body;

    try {
      const result = await pool.query('INSERT INTO ideas (text) VALUES ($1) RETURNING id', [text]);
      const newIdeaId = result.rows[0].id;
      res.status(201).json({ message: 'Idea added successfully', ideaId: newIdeaId });
    } catch (error) {
      console.error('Error adding idea:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  deleteIdea: async (req, res) => {
    const { ideaId } = req.params;

    try {
      // Check if the idea exists
      const existingIdea = await pool.query('SELECT * FROM ideas WHERE id = $1', [ideaId]);
      if (existingIdea.rows.length === 0) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // Delete the idea
      await pool.query('DELETE FROM ideas WHERE id = $1', [ideaId]);

      res.status(200).json({ message: `Idea with ID ${ideaId} deleted successfully` });
    } catch (error) {
      console.error('Error deleting idea:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  deleteAllIdeas: async (req, res) => {
    try {
      // Delete all ideas
      await pool.query('DELETE FROM ideas');
      res.status(200).json({ message: 'All ideas deleted successfully' });
    } catch (error) {
      console.error('Error deleting all ideas:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = ideasController;
