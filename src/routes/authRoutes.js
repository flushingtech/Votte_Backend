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

  if (!access_token) {
    return res.status(400).json({ message: 'Missing access_token' });
  }

  // Step 1: Verify token with Google
  let tokenData;
  try {
    const tokenInfoUrl = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`;
    const { data } = await axios.get(tokenInfoUrl);
    tokenData = data;
  } catch (error) {
    console.error('❌ [Step 1] Google tokeninfo failed:', error.response?.data || error.message);
    return res.status(401).json({ message: 'Invalid or expired Google token', error: error.response?.data?.error_description || error.message });
  }

  // The aud field may be a comma-separated list; check if our client ID is included
  const audList = (tokenData.aud || '').split(',').map(s => s.trim());
  if (!audList.includes(process.env.GOOGLE_CLIENT_ID)) {
    console.error('❌ [Step 1] aud mismatch. Got:', tokenData.aud, 'Expected:', process.env.GOOGLE_CLIENT_ID);
    return res.status(401).json({ message: 'Unauthorized client ID' });
  }

  // Step 2: Get user info
  let email, name;
  try {
    const userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
    const userInfoRes = await axios.get(userInfoUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    email = userInfoRes.data.email;
    name = email.split('@')[0];
  } catch (error) {
    console.error('❌ [Step 2] Google userinfo failed:', error.message);
    return res.status(502).json({ message: 'Failed to fetch user info from Google', error: error.message });
  }

  // Step 3: Check/insert user in DB
  try {
    const existingUserResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (existingUserResult.rowCount === 0) {
      await pool.query('INSERT INTO users (email, name) VALUES ($1, $2)', [email, name]);
      console.log(`🆕 Inserted new user: ${email}`);

      sendWelcomeEmail(email, name).catch(err => {
        console.error('⚠️ Failed to send welcome email, but user created successfully:', err.message);
      });
    }
  } catch (error) {
    console.error('❌ [Step 3] Database error:', error.message);
    return res.status(500).json({ message: 'Database error during login', error: error.message });
  }

  // Step 4: Generate JWT
  try {
    const token = generateToken({ email, name });
    res.status(200).json({ token, user: { email, name } });
  } catch (error) {
    console.error('❌ [Step 4] JWT sign failed:', error.message);
    res.status(500).json({ message: 'Failed to generate auth token', error: error.message });
  }
});

module.exports = router;
