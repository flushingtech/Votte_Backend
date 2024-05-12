const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ideasController = require('./controllers/ideas');
const votingController = require('./controllers/voting');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins during development
app.use(cors());

// Middleware
app.use(bodyParser.json());

// Default endpoint
app.get("/", (req, res) => {
    res.send("Idea Backend Deployed");
});

// Idea routes
app.get('/ideas', ideasController.getAllIdeas);
app.post('/ideas', ideasController.addIdea);
app.delete('/ideas/:ideaId', ideasController.deleteIdea);
app.delete('/ideas', ideasController.deleteAllIdeas);

// Voting routes
app.post('/ideas/:ideaId/vote', votingController.voteForIdea);
app.delete('/ideas/:ideaId/vote', votingController.deleteVoteForIdea);
app.get('/user/votes', votingController.getUserVotes);
app.put('/ideas/reset-votes', votingController.resetAllVotes);
app.put('/ideas/:ideaId/reset-votes', votingController.resetVotesForIdea);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
