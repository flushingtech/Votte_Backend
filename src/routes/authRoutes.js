const express = require('express');
const passport = require('passport');

const router = express.Router();

function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}

router.get('/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/google/failure',
  }),
  (req, res) => {
    // Redirect to the frontend with success and user info (or just success)
    res.redirect(`http://localhost:5173/home?loggedIn=true`);
  }
);

router.get('/auth/google/failure', (req, res) => {
  res.status(401).json({ success: false, message: 'Failed to authenticate' });
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy(() => {
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

module.exports = router;
