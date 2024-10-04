const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./src/routes/authRoutes');
const ideasRoute = require('./src/routes/ideasRoutes');
const cors = require('cors');
const pool = require('./db');  // Import the database connection

require('./src/auth'); // Assuming you already set up Google OAuth2 here

const app = express();
app.use(express.json());
app.use(cors());

console.log(process.env.GOOGLE_CLIENT_ID);

app.use('/', authRoutes);

// Use the ideas route
app.use('/api/ideas', ideasRoute);

// Default route for root '/'
app.get('/', (req, res) => {
    res.send('Welcome to the Votte API!');
});

// Catch-all route for undefined paths (404 handling)
app.use((req, res) => {
    res.status(404).send('404 - Not Found');
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err);
    } else {
        console.log('PostgreSQL connected:', res.rows[0]);
    }
});

// Start the server
app.listen(5500, () => console.log('listening on port: 5500'));
