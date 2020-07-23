const mongoose = require('mongoose')

module.exports = (brain, cb) => {
	// register issues database
	brain.lazydb.$register("gitlabIssues", {
		id: Number,
		created_at: Date,
		updated_at: Date,

		projectId: {
			type: mongoose.Schema.ObjectId,
			ref: "projects"
		}

	});

	function fire(cb) {
		brain.gitlab.copyPage({
			cache: true,
			text: "Syncing Gitlab Issues",
			db: brain.lazydb.gitlabIssues,
			route: "/issues",
			cache: false,
			beforeUpdate: (value, cb) => {
				// lookup project
				brain.lazydb.gitlabProjects.findOne({id: value.project_id}, (err, project) => {
					if(project) value.projectId = project._id;
					cb();
				})
			}
		}, cb)
	}

	// every 5 mins, sync gitlab user
	brain.schedule("gitlab-issues", "*/5 * * * *", fire)

	fire()
	cb()
}
