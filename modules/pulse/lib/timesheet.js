const utils = require("../../../lib/utils.js")
const debug = require('debug')('brain:pulse:timesheet')
const mongoose = require('mongoose')

function fixzero(num) {
	if (num < 10) {
		return ("0" + num);
	}
	return (num)
}

module.exports = (brain, cb) => {
	const self = brain;

	// register issues database
	brain.lazydb.$register("pulseTimesheet", {
		date: Date,

		year: Number,
		month: Number,
		day: Number,

		userId: {
			type: mongoose.Schema.ObjectId,
			ref: "gitlabUsers"
		},

		// project
		projectId: {
			type: mongoose.Schema.ObjectId,
			ref: "gitlabProjects"
		},

		// issue
		issueId: {
			type: mongoose.Schema.ObjectId,
			ref: "gitlabIssues"
		},

		// Number of minutes spend
		spend: Number
	});

	function fire(cb) {
		debug("Computing Timesheet");

		const db = brain.lazydb.pulseTimesheet;

		const data = {
			users: {},
			compiled: []
		}

		const startDate = new Date()
		startDate.setMonth(startDate.getMonth() - 4)
		// startDate.setDate(1)
		// startDate.setHours(0)
		// startDate.setMinutes(0)
		// startDate.setSeconds(0)
		// startDate.setMilliseconds(1)

		utils.sync([
			// get all users
			(next) => {
				data.users = {}
				self.mongoPage(self.lazydb.gitlabUsers.find({}), (item, next) => {
					data.users[item.id] = item;
					data.users[item.id].spent = {}
					next();
				}, next)
			},

			// match all intresting discussions
			(next) => {
				self.mongoPage(self.lazydb.gitlabDiscussions
					.find({ 'notes.updated_at': { $gte: startDate } })
					.find({  })
					.sort({ updated_at: -1 })
					.populate("issueId")
					, (item, next) => {
					
						for (var b in item.notes) {
							const note = item.notes[b];

							const spentMatch = note.body.match(/(added|subtracted) (.*) of time spent at (.*)/);
							if (spentMatch) {
								const user = data.users[note.author.id];
								const command = spentMatch[1]
								const spent = utils.datesec(spentMatch[2])
								const spentDate = new Date(spentMatch[3])

								if(!user) continue;
								if(!item.issueId) continue;
								
								// populate spent
								if (!user.spent[spentDate.getFullYear()]) user.spent[spentDate.getFullYear()] = {};
								const year = user.spent[spentDate.getFullYear()];

								if (!year[spentDate.getMonth() + 1]) year[spentDate.getMonth() + 1] = {};
								const month = year[spentDate.getMonth() + 1];

								if (!month[spentDate.getDate()]) month[spentDate.getDate()] = {};
								const day = month[spentDate.getDate()];

								if (!day[item.issueId.projectId]) day[item.issueId.projectId] = {};
								const project = day[item.issueId.projectId];

								if (!project[item.issueId._id]) project[item.issueId._id] = { spent: 0 };
								const issue = project[item.issueId._id];

								if (command == "added") {
									issue.spent += spent;
								}
								else if (command == "subtracted") {
									issue.spent -= spent;
								}

								debug("User #" + note.author.id + " " + note.author.name + " " + spent + " " + spentDate.toString());
							}
						}
						next()
					}, next)
			},

			// compile informations
			(next) => {
				const spendTab = data.compiled;

				for (var a in data.users) {
					const user = data.users[a];

					if (Object.keys(user.spent).length > 0) {
						for (var y in user.spent) {
							const year = user.spent[y];

							for (var m in year) {
								const month = year[m];

								for (var d in month) {
									const day = month[d];

									for (var p in day) {
										const project = day[p];

										for (var i in project) {
											const issue = project[i];

											spendTab.push({
												search: {
													date: new Date(`${y}/${m}/${d}`),
													userId: user._id,
													year: y,
													month: m,
													day: d,

													projectId: p,
													issueId: i,
												},

												data: {
													// insert daily spend time
													spend: issue.spent
												}
											})
										}
									}
								}
							}
						}
					}
				}
				next()
			},

			// update each item into database
			(next) => {
				utils.eachArray(data.compiled, (index, item, nextItem, last) => {
					if (last === true) {
						next();
						return;
					}
					const d = Object.assign({}, item.search, item.data);
					db.updateOne(item.search, d, { upsert: true }, (err) => {
						nextItem();
					})
				})
			}
		], () => {
			debug("Timesheet Updated");
			if (cb) cb()
		})
	}

	// every 5 mins, compute timesheet
	brain.schedule("pulse-timesheet", "*/5 * * * *", fire)

	fire()
	cb()
}
