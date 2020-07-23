const debug = require('debug')('brain:gitlab:todos');
const utils = require("../../../lib/utils");

module.exports = (brain, cb) => {
	// register user database
	brain.lazydb.$register("gitlabTodos", {
		id: Number
	});

	function fire(cb) {
		const self = brain;
		const api = brain.gitlab;

		// get my todo list
		api.get("/todos", {}, (err, items) => {
			if(!items ||items.length == 0) {
				if(cb) cb();
				return;
			}

			const routes = {};
			const done = [];
			const issues = {};

			debug("TODO to process: "+items.length);
			utils.sync([
				// get all instresting todo
				(next) => {
					utils.eachArray(items, (index, value, nextItem, last) => {
						if(last === true) {
							next();
							return;
						}

						if((value.action_name == "mentioned" || value.action_name == "directly_addressed") && value.target_type == "Issue") {
							const key = `/projects/${value.project.id}/issues/${value.target.iid}/discussions`;
							if(!routes[key]) routes[key] = {route:key,count:0,project:value.project};
							routes[key].count++;

							// get issue
							if(!issues[value.target.id]) {
								api.get(`/projects/${value.project.id}/issues/${value.target.iid}`, {}, (err, issue) => {
									if(!issue) {
										console.log(`Not found /projects/${value.project.id}/issues/${value.target.iid}`);
										nextItem();
										return;
									}

									self.lazydb.gitlabIssues.updateOne({id: issue.id}, issue, {upsert: true}, (err) => {
										self.lazydb.gitlabIssues.findOne({id: issue.id}).lean().exec((err, issue) => {
											routes[key].issue = issue;
											issues[value.target.id] = issue;
											nextItem();
										})

									})
								})
							}
							else {
								routes[key].issue = issues[value.target.id];
								nextItem();
							}

							// add mask as done
							done.push("/todos/"+value.id+"/mark_as_done")
						}
						else {
							nextItem();
						}
					})
				},

				// sync discussions
				(next) => {
					const aroutes = Object.values(routes);

					function getAll() {
						const item = aroutes.shift();
						if(!item) {
							next();
							return;
						}

						brain.syncSimple({
							text: "Syncing TODOS Discussion",
							db: self.lazydb.gitlabDiscussions,
							route: item.route,
							cache: false,
							beforeUpdate: (value, cb) => {
								value.issueId = item.issue._id;
								cb();
							}
						}, () => {
							process.nextTick(getAll);
						})
					}

					getAll();
				},

				// mark as read
				(next) => {

					function pop() {
						const item = done.shift();
						if(!item) {
							next();
							return;
						}
						api.post(item, {}, (err) => {
							process.nextTick(pop);
						})
					}

					pop();
				},
			], () => {
				// disabled atm
				// const aroutes = Object.values(routes);
				// if(aroutes.length > 0) {
				// 	self.getMyMessages(() => {
				// 		cb();
				// 	}, 0)
				// }
				// else {
				// 	cb();
				// }
				if(cb) cb();
			})
		});
	}

	// every 5 mins, sync gitlab todos
	brain.schedule("gitlab-todos", "*/5 * * * * *", fire)

	fire()
	cb()
}
