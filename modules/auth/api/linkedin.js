const passport = require("passport");
const jwt = require("jsonwebtoken");

module.exports = (brain, cb) => {
  brain.pulse.router.get(
    "/linkedin",
    passport.authenticate("linkedin"),
    (req, res) => {}
  );

  brain.pulse.router.get(
    "/linkedin/callback",
    passport.authenticate("linkedin"),
    async (req, res) => {
      const user = req.user;
      if (user == null) {
        res.error(400, "Bad request");
      }
      /** This is what ends up in our JWT */
      const payload = {
        email: req.user.email,
        expires: Date.now() + 3600 * 1000
      };

      /** assigns payload to req.user */
      req.login(payload, { session: false }, error => {
        if (error) {
          res.error(400, "Bad request");
        }

        const token = jwt.sign(
          JSON.stringify(payload),
          brain.options.auth.jwtSecretKey
        );

        return res.status(200).send({ user, token });
      });
    }
  );

  cb();
};
