const express = require('express');
const ideasController = require('../controllers/ideas');

const router = express.Router();

// Route to get all ideas
router.get('/', ideasController.getAllIdeas);

// Route to add a new idea
router.post('/', ideasController.addIdea);

// Route to delete an idea
router.delete('/:ideaId', ideasController.deleteIdea);

// Route to delete all ideas
router.delete('/', ideasController.deleteAllIdeas);

module.exports = router;
