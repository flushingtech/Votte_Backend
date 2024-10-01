const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./src/routes/authRoutes');
const cors = require('cors');

require('./src/auth'); // Assuming you already set up Google OAuth2 here

const app = express();
app.use(express.json());
app.use(cors());

console.log(process.env.GOOGLE_CLIENT_ID);

app.use('/', authRoutes);

// Default route for root '/'
app.get('/', (req, res) => {
    res.send('Welcome to the Votte API!');
});

// Catch-all route for undefined paths (404 handling)
app.use((req, res) => {
    res.status(404).send('404 - Not Found');
});

app.listen(5500, () => console.log('listening on port: 5500'));
