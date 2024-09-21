const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./src/routes/authRoutes');
require('./src/auth'); // Assuming you already set up Google OAuth2 here

const app = express();

app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRoutes);

app.listen(5000, () => console.log('listening on port: 5000'));
