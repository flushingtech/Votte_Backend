const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const pool = require('../../db'); // same style as your other files
const { sendWelcomeEmail } = require('../services/emailService');
const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET;

const generateToken = (user) => {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
    },
    SECRET_KEY,
    { expiresIn: '7d' }
  );
};

router.post('/googlelogin', async (req, res) => {
  console.log('in google routes');
  const { access_token } = req.body;

  try {
    // Step 1: Verify token
    const tokenInfoUrl = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`;
    const { data } = await axios(tokenInfoUrl);

    if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: 'Unauthorized client ID' });
    }

    // Step 2: Get user info
    const userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
    const userInfoRes = await axios.get(userInfoUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const email = userInfoRes.data.email;
    const name = email.split('@')[0];

    // Step 3: Check if user exists
    const existingUserQuery = 'SELECT * FROM users WHERE email = $1';
    const existingUserResult = await pool.query(existingUserQuery, [email]);

    if (existingUserResult.rowCount === 0) {
      // Step 4: Insert new user
      const insertQuery = 'INSERT INTO users (email, name) VALUES ($1, $2)';
      await pool.query(insertQuery, [email, name]);
      console.log(`🆕 Inserted new user: ${email}`);

      // Step 4.5: Send welcome email (non-blocking)
      sendWelcomeEmail(email, name).catch(err => {
        console.error('⚠️ Failed to send welcome email, but user created successfully:', err.message);
      });
    }

    // Step 5: Generate token and send response
    const token = generateToken({ email, name });

    res.status(200).json({ token, user: { email, name } });

  } catch (error) {
    console.error('❌ Error during Google login:', error.message);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

module.exports = router;
