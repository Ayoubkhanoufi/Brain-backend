const utils = require("../../../lib/utils.js")
const debug = require('debug')('brain:pulse:users')
const mongoose = require('mongoose')

// must be refacto
module.exports = (brain, cb) => {
	const self = brain;

	brain.pulse.router.get('/timesheet/:group/:mode', (req, res) => {
		const groups = {};
		var groupField = "userId";
		const now = new Date();
		const ret = {}

		// sanatize group by
		if(req.params.group == "projects") {
			groupField = "projectId";
		}

		// sanatize timing params
		if(req.params.mode == "year") {
			const y = parseInt(req.query.year);
			req.params.year = y > 2017 && y < 2100 ? y : now.getFullYear()
		}
		else if(req.params.mode == "month") {
			const y = parseInt(req.query.year);
			req.params.year = y > 2017 && y < 2100 ? y : now.getFullYear()

			const m = parseInt(req.query.month);
			req.params.month = m > 0 && m <= 12 ? y : now.getMonth()+1
		}
		else {
			res.error("Unknown parameter mode "+req.params.mode);
			return;
		}


		utils.sync([

			// compute pulse timesheet data
			(next) => {
				self.lazydb.pulseTimesheet
				.find({})
				.populate(groupField)
				.lean()
				.sort({date: 1})
				.exec((err, data) => {

					utils.eachArray(data, (index, item, nextItem, last) => {
						if(last === true) {
							next();
							return;
						}

						// create group
						if(!groups[item[groupField]._id]) groups[item[groupField]._id] = {}

						const ptr = groups[item[groupField]._id];

						if(!ptr[item.year]) ptr[item.year] = {}
						if(!ptr[item.year][item.month]) ptr[item.year][item.month] = {}

						// prepare input
						const input = ptr[item.year][item.month];
						if(!input.total) input.total = {}
						//if(!input.project) input.project = {}

						// total spend for the month
						if(!input.total.spend) input.total.spend = 0;
						input.total.spend += item.spend;

/*
						// project spend for the month
						if(!input.project[item.projectId]) input.project[item.projectId] = {}
						const project = input.project[item.projectId];

						if(!project.spend) project.spend = 0;
						project.spend += item.spend;

						// recompute spend percentil
						for(var a in input.project) {
							const project = input.project[a];
							project.spendPercent = project.spend*100/input.total.spend;
						}
*/

						nextItem();
					})
				})
			},


			// prepare rendering
			(next) => {
				// prepare headers
				ret.columns = [
					{ title: 'Resource', dataIndex: '' }
				]
				for(var m=1; m<=12; m++) {
					ret.columns.push({
						title: req.params.year+' - '+utils.fixzero(m),
						dataIndex: 'm_'+m+".total.spend",
					});
				}

				// prepare rows
				const prepare = {}

				utils.eachArray(groups, (uid, user, nextItem, last) => {
					if(last === true) {
						ret.rows = Object.values(prepare);
						next();
						return;
					}
					const data = user[req.params.year];
					const key = uid+"-"+req.params.year

					// prepare user information
					prepare[key] = {}
					const ptr = prepare[key];


					// feed user information
					if(groupField === "userId") {
						self.lazydb.gitlabUsers
							.findOne({_id: uid})
							.lean()
							.exec((err, dbUser) => {
								if(err || ! dbUser) {
									ptr.info = { }
									nextItem();
									return;
								}

								ptr.info = {
									_id: dbUser._id,
									id: dbUser.id,
									title: dbUser.name,
									description: dbUser.email,
									avatar: dbUser.avatar_url
								}

								// year mode
								for(var m=1; m<=12; m++) {
									const mkey = "m_"+m;

									if(data[m]) {
										ptr[mkey] = data[m]
									}
									else {
										ptr[mkey] = {}
									}
								}
								nextItem();
						})
					}
					else if(groupField === "projectId") {
						self.lazydb.gitlabProjects
							.findOne({_id: uid})
							.lean()
							.exec((err, dbProject) => {
								if(err || ! dbProject) {
									ptr.info = { }
									nextItem();
									return;
								}
								ptr.info = {
									_id: dbProject._id,
									id: dbProject.id,
									title: dbProject.name_with_namespace,
									description: dbProject.description,
									avatar: dbProject.avatar_url
								}

								// year mode
								for(var m=1; m<=12; m++) {
									const mkey = "m_"+m;

									if(data[m]) {
										ptr[mkey] = data[m]
									}
									else {
										ptr[mkey] = {}
									}
								}
								nextItem();
						})
					}

				})

			},


		], () => {
			res.reply(ret);
		})
	})

	cb()
}
