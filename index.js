const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./src/routes/authRoutes');
const cors = require('cors');

require('./src/auth'); // Assuming you already set up Google OAuth2 here

const app = express();
app.use(express.json())
app.use(cors());

console.log(process.env.GOOGLE_CLIENT_ID)

// app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
// app.use(passport.initialize());
// app.use(passport.session());

app.use('/', authRoutes);

app.listen(5500, () => console.log('listening on port: 5500'));
