module.exports = (brain, cb) => {
	// register projects database
	brain.lazydb.$register("gitlabProjects", {
		id: Number
	});

	function fire(cb) {
		brain.gitlab.copyPage({
			text: "Syncing Gitlab Projects",
			db: brain.lazydb.gitlabProjects,
			route: "/projects",
			cache: false
		}, cb)
	}

	// every 5 mins, sync gitlab user
	brain.schedule("gitlab-projects", "*/5 * * * *", fire)

	fire()
	cb()
}
