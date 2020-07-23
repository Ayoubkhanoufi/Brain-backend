const utils = require("../../../lib/utils.js")
const debug = require('debug')('brain:pulse:users')
const mongoose = require('mongoose')

// must be refacto
module.exports = (brain, cb) => {
	const self = brain;

	brain.pulse.router.get('/users', (req, res) => {
		const ret = {
			rows: []
		}

		utils.sync([

			// compute pulse timesheet data
			(next) => {
				const find = {}

				if(req.query.id) find._id = req.query.id;

				self.lazydb.gitlabUsers
				.find(find)
				.lean()
				.sort({created_at: -1})
				.exec((err, data) => {
					self.eachArray(data, (index, user, nextItem, last) => {
						if(last === true) {
							next();
							return;
						}
						ret.rows.push(user);
						nextItem();
					})
				})
			},
		], () => {
			res.reply(ret);
		})
	})

	cb()
}
