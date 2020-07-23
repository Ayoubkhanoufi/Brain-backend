const utils = require("../../lib/utils.js")
const express = require('express');
const mongoose = require('mongoose')
const debug = require('debug')('brain:careers')
const i18n = require("i18n");

module.exports = (brain, cb) => {

	utils.sync([

		// start offer schema (must be refacto in lib/)
		(next) => {
			brain.lazydb.$register("technologies", {
			});

			brain.lazydb.$register("skills", {
			});

			brain.lazydb.$register("offers", {
				date: Date,
				title: String,
				status: String,

				technologies: [{
					type: mongoose.Schema.ObjectId,
					ref: "technologies",
				}],

				skills: [{
					type: mongoose.Schema.ObjectId,
					ref: "skills",
				}],
			});

			next();
		},

		// start careers module
		(next) => {
			brain.careers = {
				router: new express.Router
			}

			// initialize i18n
			i18n.configure({
				locales:['fr', 'en'],
				directory: __dirname + '/locales'
			});
			brain.careers.router.use(i18n.init);

			// add public directory
			brain.careers.router.use("/public", express.static(__dirname + "/public"));

			// add data file from middleware
			const dataFile = brain.options.middlewareDataDir;
			brain.careers.router.use("/files", express.static(dataFile));
			next();
		},

		// load API
		(next) => {
			debug("Loading Collaborators API");
			require("./api/collaborators.js")(brain, next);
		},

		// load API
		(next) => {
			debug("Loading Offers API");
			require("./api/offers.js")(brain, next);
		},

		// load Views
		(next) => {
			debug("Loading Views");
			require("./views/offers.js")(brain, next);
		},

		// apply router
		(next) => {
			brain.web.use('/careers', brain.careers.router)
			next();
		}
	], cb)

}
