const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const ideasRoute = require('./src/routes/ideasRoutes');
const eventsRouter = require('./src/routes/eventsRoutes');
const votesRouter = require('./src/routes/votesRoutes');
const discordRoutes = require('./src/routes/discordRoutes');
const leaderboardRoutes = require('./src/routes/leaderboardRoutes');
const usersRoutes = require('./src/routes/usersRoutes');
const imageRoutes = require('./src/routes/imageRoutes'); // ✅ New image upload route

const pool = require('./db');  // PostgreSQL connection
require('./src/auth');         // Google OAuth setup

const app = express();
app.use(express.json());
app.use(cors());

// Route registrations
app.use('/', authRoutes);
app.use('/api/ideas', ideasRoute);
app.use('/api/events', eventsRouter);
app.use('/api/votes', votesRouter);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/images', imageRoutes); // ✅ New route

// Default root
app.get('/', (req, res) => {
    res.send('Welcome to the Votte API!');
});

// Multer error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File size too large (2 MB+ not allowed)" });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({ message: "Only 3 files per operation allowed" });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ message: "Unsupported file format" });
        }
    }
    next(err);
});

// Catch-all route
app.use((req, res) => {
    res.status(404).send('404 - Not Found');
});

// Test PostgreSQL connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Error connecting to PostgreSQL:', err);
    } else {
        console.log('✅ PostgreSQL connected:', res.rows[0]);
    }
});

// Start server
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
