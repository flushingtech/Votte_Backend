const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

//const GOOGLE_CLIENT_ID = '631312072076-69rf4lip0j8htdfr6dt10tkeah0ga9vt.apps.googleusercontent.com'
//const GOOGLE_CLIENT_SECRET = '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'

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:5000/auth/google/callback",
  passReqToCallback: true,
},
function(request, accessToken, refreshToken, profile, done) {
  return done(null, profile);
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});