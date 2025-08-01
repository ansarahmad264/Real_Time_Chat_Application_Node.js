import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../Models/user.model.js';
import { ApiError } from '../Utils/ApiError.js';

dotenv.config();

passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { sub: googleId, email, name: fullName, picture, email_verified: isVerified } = profile._json;
          const username = email.split('@')[0];
  
          let user = await User.findOne({ email });

          if(user){
            if(user.authProvider == "local"){
              throw new ApiError(400,"You have registed via manual Signup , please try to Login using your Password!")
            }
          }
  
          if (!user) {
            user = await User.create({
              fullName,
              email,
              googleId,
              username,
              profilePic: picture,
              authProvider: "google",
              isVerified
            });
          }
  
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
  