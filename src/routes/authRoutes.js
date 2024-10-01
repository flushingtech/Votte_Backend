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
	console.log('in google routes')
	const { access_token } = req.body //access token sent from frot ent using the package @react-oauth/google

	try {

		//getting aud field to check client id match with our clien id sent from frontend
		const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`
		const { data } = await axios(url)

		//here we compare if the client id sent from react is same of the client id of our app
		if (data.aud != process.env.GOOGLE_CLIENT_ID) {
			return res.status(400).send({ message: 'Access Token not meant for this app.' })
		}


		//after checking access token is valid and from our app now we need to get the userinfo 
		//for the login or register funtionallity
		const urlToGetUserInfo = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
		const resp = await axios(urlToGetUserInfo)
		const { email_verified, name, email, sub } = resp.data //destructuring data we need


		//checking if google email es virified or not
		if (!email_verified) {
			return res.status(400).send({ message: 'it seems your google account is not verified' })
		}

    res.json({
      token : generateToken(resp.data)
    })

		

	} catch (error) {
		console.log(error)
		res.status(400).send({ message: 'something went wrong' })
	}
})




// // Step 1: Initiate Google OAuth login
// router.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

// // Step 2: Handle Google OAuth callback, generate JWT, and send it as JSON
// router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/auth/google/failure' }), (req, res) => {


//   console.log('en augth google')
//   // Create a JWT token for the user
//   const token = jwt.sign({ id: req.user.id, email: req.user.email }, SECRET_KEY, { expiresIn: '1h' });

//   // Send the token back as JSON (no redirect)
//   res.json({ success: true, token });
// });



// // Optional failure route
// router.get('/auth/google/failure', (req, res) => {
//   console.log('en augh failure')
//   res.status(401).json({ success: false, message: 'Failed to authenticate' });
// });

// Export the router
module.exports = router;
