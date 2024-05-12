const express = require('express');
const votingController = require('../controllers/voting');

const router = express.Router();

// Route to vote for an idea
router.post('/:ideaId/vote', votingController.voteForIdea);

// Route to delete a user's vote for an idea
router.delete('/:ideaId/vote', votingController.deleteVoteForIdea);

// Route to fetch user votes
router.get('/user/votes', votingController.getUserVotes);

// Route to reset the vote count for all ideas
router.put('/reset-votes', votingController.resetAllVotes);

// Route to reset the vote count for a specific idea
router.put('/:ideaId/reset-votes', votingController.resetVotesForIdea);

module.exports = router;
