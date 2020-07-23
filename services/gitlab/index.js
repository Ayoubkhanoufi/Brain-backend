const utils = require("../../lib/utils.js")

class Gitlab {
	constructor(brain) {
		this.brain = brain;
	}

	load(cb) {
		utils.sync([
			next => { require("./lib/gitlab-users.js")(this.brain, next); },
			next => { require("./lib/gitlab-projects.js")(this.brain, next); },
			next => { require("./lib/gitlab-issues.js")(this.brain, next); },
			next => { require("./lib/gitlab-discussions.js")(this.brain, next); },
			next => { require("./lib/gitlab-todos.js")(this.brain, next); },
		], cb)
	}
}

module.exports = Gitlab;
