const utils = require("../../lib/utils.js");
const express = require("express");
const debug = require("debug")("brain:pulse");

module.exports = (brain, cb) => {
  utils.sync(
    [
      (next) => {
        require("./models/project.js")(brain, next);
        require("./models/offer.js")(brain, next);
      },

      // start pulse module
      (next) => {
        brain.pulse = {
          router: new express.Router(),
        };
        next();
      },

      (next) => {
        require("./resources/project.js")(brain, next);
      },
      (next) => {
        require("./resources/offer.js")(brain, next);
      },
      (next) => {
        require("./file/upload.js")(brain, next);
      },

      // apply router
      (next) => {
        brain.web.use("/resources", brain.pulse.router);

        next();
      },
      (next) => {
        brain.web.use("/file", brain.pulse.router);
    
        next();
      }
    ],
    cb
  );
  
  
};
