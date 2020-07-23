const utils = require("../../../lib/utils.js");
const debug = require("debug")("brain:pulse:users");
var ObjectID = require('mongoose').Types.ObjectId
const bcrypt = require("bcrypt");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
module.exports = (brain, cb) => {
  brain.pulse.router.post("/reset-password", async (req, res) => {
    const { token, password, confirmPassword } = req.body;

    try {
      if (!token || !password || !confirmPassword) {
        return res.error(400, "Bad reqest   ");
      }

      if (password !== confirmPassword) {
        return res.error(400, "The confirmed password is not valid");
      }

      let user = await brain.lazydb.users
        .findOne({
          resetPasswordToken: token,
          resetPasswordExpires: { $gt: Date.now() }
        })
        .exec();

      if (user == null) {
        return res.error(400, "Bad request ");
      }

      const payload = {
        password: await bcrypt.hash(password, 10),
        resetPasswordToken: null,
        resetPasswordExpires: null
      };

      user = await brain.lazydb.users.findByIdAndUpdate(
        { _id: user._id },
        payload,
        { new: true }
      );

      return res.json({
        message: "The password is successfully changed"
      });
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.post("/forget-password", async (req, res) => {
    const oneDay = 24 * 60 * 60 * 1000;
    const { email } = req.body;
    try {
      let user = await brain.lazydb.users.findOne({ email }).exec();

      if (user == null) {
        return res.error(400, "Email not found");
      }

      const resetPasswordToken = crypto.randomBytes(20).toString("hex");

      user = await brain.lazydb.users.findByIdAndUpdate(
        { _id: user._id },
        { resetPasswordToken, resetPasswordExpires: Date.now() + oneDay },
        { new: true }
      );
      brain.mailer.setPayload({
        to: user.email,
        subject: "Password reset request"
      });
      brain.mailer.setHTML("reset-password", { user });

      await brain.mailer.send();

      return res.json({
        message: "Kindly check your email for further instructions"
      });
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.get("/me",
    passport.authenticate("jwt", { session: false }),
    async (req, res) => {
      try {
        const { user } = req;

        const fullUser = await brain.lazydb.users
          .findOne({ email: user.email })
          .exec();

        res.status(200).send({ user: fullUser });
      } catch (error) {
        return res.error(400, "Something goes wrong");
      }
    }
  );

  brain.pulse.router.post("/login", (req, res) => {
    passport.authenticate("local", { session: false }, (error, user) => {
      if (error || !user) {
        return res.json({ 
          message: "wrong user / email "
        });
      }
      /** This is what ends up in our JWT */
      const payload = {
        email: user.email,
        expires: Date.now() + 3600 * 1000
      };

      /** assigns payload to req.user */
      req.login(payload, { session: false }, error => {
        if (error) {
          return res.error(400, "Bad request");
        }

        const token = jwt.sign(
          JSON.stringify(payload),
          brain.options.auth.jwtSecretKey
        );

        return res.status(200).send({ user, token });
      });
    })(req, res);
  });

  brain.pulse.router.post("/register", async (req, res) => {  
    const { email, password, firstName, lastName, isAdmin, isChief, isCollaborator,skills } = req.body;

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = new brain.lazydb.users({
        email,
        password: passwordHash,
        firstName,
        lastName,
        isAdmin,
        isChief,
        isCollaborator,
        skills
      });
      await user.save();

      res.status(200).send({ user });
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.get("/users", async (req, res) => {
    try {
      const result = await brain.lazydb.users.find({}).lean().exec();
      return res.json(result);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.put("/user/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const user = await brain.lazydb.users.findByIdAndUpdate(
        ObjectID(id),
        { $set: data },
        { new: true }
      );

      return res.json(user);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.delete("/user/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const user = await brain.lazydb.users.findByIdAndRemove(ObjectID(id));

      return res.json(user);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  cb();
};
