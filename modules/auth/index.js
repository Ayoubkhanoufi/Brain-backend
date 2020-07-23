const utils = require("../../lib/utils.js");
const express = require("express");
const debug = require("debug")("brain:pulse");
const passport = require("./lib/passport");

module.exports = (brain, cb) => {
  utils.sync(
    [
      next => {
        require("./lib/user.js")(brain, next);
      },

      // start pulse module
      next => {
        brain.pulse = {
          router: new express.Router()
        };
        next();
      },

      // load API
      next => {
        debug("Loading User API");
        require("./api/user.js")(brain, next);
      },
      next => {
        require("./api/linkedin.js")(brain, next);
      },

      // apply router
      next => {
        brain.web.use("/auth", brain.pulse.router);
        next();
      },
      next => {
        passport(brain);
        next();
      }
    ],
    cb
  );
};
