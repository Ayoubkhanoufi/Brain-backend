const utils = require("../../lib/utils.js");
const express = require("express");
const debug = require("debug")("brain:pulse");

module.exports = (brain, cb) => {
  utils.sync(
    [
      (next) => {
        require("./lib/project.js")(brain, next);
      },

      // start pulse module
      (next) => {
        brain.pulse = {
          router: new express.Router(),
        };
        next();
      },

      (next) => {
        require("./api/project.js")(brain, next);
      },

      // apply router
      (next) => {
        brain.web.use("/bexio", brain.pulse.router);
        next();
      },
    ],
    cb
  );
};
