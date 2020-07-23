const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

const bcrypt = require("bcrypt");
const crypto = require("crypto");

module.exports = brain => {
  const UserModel = brain.lazydb.users;

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password"
      },
      async (email, password, done) => {
        try {
          const user = await UserModel.findOne({ email }).exec();

          if (user == null) {
            done("User not defined");
          }

          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (passwordsMatch === true) {
            return done(null, user);
          } else {
            return done("Incorrect Username / Password");
          }
        } catch (error) {
          done(error);
        }
      }
    )
  );

  passport.use(
    new JWTStrategy(
      {
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey: brain.options.auth.jwtSecretKey
      },
      (jwtPayload, done) => {
        
        if (Date.now() > jwtPayload.expires) {
          return done("jwt expired");
        }

        return done(null, jwtPayload);
      }
    )
  );

  passport.use(
    new LinkedInStrategy(
      {
        clientID: brain.options.linkedin.clientId,
        clientSecret: brain.options.linkedin.secretKey,
        callbackURL: brain.options.linkedin.callbackURL,
        scope: ["r_liteprofile", "r_emailaddress"]
      },
      async function(accessToken, refreshToken, profile, done) {
        try {
          const linkedinId = profile._json.id;
          const firstName = profile.name.givenName;
          const lastName = profile.name.familyName;
          const email = profile.emails[0].value;

          let user = await UserModel.findOne({ linkedinId }).exec();

          if (user == null) {
            const payload = {
              firstName,
              lastName,
              email,
              linkedinId,
              password: crypto.randomBytes(20).toString("hex")
            };

            user = new UserModel(payload);
            user = await user.save();
          } else {
            user = await UserModel.findOneAndUpdate(
              { linkedinId },
              {
                $set: { linkedinId }
              },
              { new: true }
            ).exec();
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};
