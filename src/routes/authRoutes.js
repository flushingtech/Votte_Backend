const express = require('express');
// const passport = require('passport');
const jwt = require('jsonwebtoken');
const axios = require('axios')
require('dotenv').config();  // Load environment variables

const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET;  // Get the JWT secret from .env

const generateToken = (user)=>{
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  )
}

router.post('/googlelogin', async (req, res) => {
	console.log('in google routes');
	const { access_token } = req.body;
  
	try {
	  // Verify the access token with Google
	  const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`;
	  const { data } = await axios(url);
  
	  // Ensure the audience matches the expected client ID
	  if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
		return res.status(401).json({ message: 'Unauthorized client ID' });
	  }
  
	  // Fetch additional user information from Google
	  const userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
	  const userInfo = await axios.get(userInfoUrl, {
		headers: { Authorization: `Bearer ${access_token}` },
	  });
  
	  // Generate JWT token
	  const token = generateToken(userInfo.data);
  
	  // Send token and user info to frontend
	  res.json({ token, user: userInfo.data });
	} catch (error) {
	  console.error('Error during Google login:', error);
	  res.status(500).json({ message: 'Login failed' });
	}
  });
  


// Export the router
module.exports = router;
