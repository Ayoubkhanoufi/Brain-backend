const utils = require("../../lib/utils.js")
const express = require('express');
const debug = require('debug')('brain:pulse')

module.exports = (brain, cb) => {
	
	utils.sync([
		// start pulse module
		(next) => {
			brain.pulse = {
				router: new express.Router
			}
			next();
		},

		// load timesheet
		(next) => {
			debug("Loading libraries");
			require("./lib/timesheet.js")(brain, next);
		},

		// load API
		(next) => {
			debug("Loading User API");
			require("./api/pulse-users.js")(brain, next);
		},

		// load API
		(next) => {
			debug("Loading Timesheet API");
			require("./api/timesheet.js")(brain, next);
		},

		// apply router
		(next) => {
			brain.web.use('/pulse', brain.pulse.router)
			next();
		}
	], cb)

}
