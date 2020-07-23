module.exports = (brain, cb) => {
	// register user database
	brain.lazydb.$register("gitlabUsers", {
		id: Number,
		current_sign_in_at: Date,
		created_at: Date,
	});

	function fire(cb) {
		brain.gitlab.copyPage({
			text: "Syncing Gitlab Users",
			db: brain.lazydb.gitlabUsers,
			route: "/users",
			cache: false
		}, cb)
	}

	// every 5 mins, sync gitlab user
	brain.schedule("gitlab-users", "*/5 * * * *", fire)

	fire();
	cb();
}
