const mongoose = require('mongoose')
const utils = require("../../../lib/utils");

module.exports = (brain, cb) => {

	// register issues database
	brain.lazydb.$register("gitlabDiscussions", {
		id: String,
		notes: [{
			created_at: Date,
			updated_at: Date,
			body: String,
			author: {
				username: String
			}
		}],
		issueId: {
			type: mongoose.Schema.ObjectId,
			ref: "gitlabIssues"
		}
	});

	function fire(cb) {
		const self = brain;
		const sleep = 50;
		const api = brain.gitlab;

		function updateComments(issue, comments, cb) {
			utils.eachArray(comments, (index, value, nextItem, last) => {
				if(last === true) {
					cb();
					return;
				}

				value.issueId = issue._id;
				self.lazydb.gitlabDiscussions.updateOne({id: value.id}, value, {upsert: true}, (err) => {
					nextItem();
				})
			})
		}

		self.mongoPage(self.lazydb.gitlabIssues.find({state: "opened"}).sort({updated_at: -1}), (item, next) => {

			const opts = {
				page: 50,
				cache: true,
				sleep: sleep
			}
			var lastHash;

			function pageAPI(num) {
				const route = `/projects/${item.project_id}/issues/${item.iid}/discussions`;
				api.get(route, {scope: "all", per_page: opts.page, page:num, cache: true}, (err, comments, hash) => {

					if(!comments || comments.length == 0) {
						api.revalidate(hash);
						if(lastHash) api.revalidate(lastHash);
						if(next) next();
						return;
					}

					lastHash = hash;

					//console.log(last, value);
					updateComments(item, comments, () => {
						process.nextTick(pageAPI, num+1);
					})

				}, opts);
			}

			pageAPI(1);
		}, () => {
			if(cb) cb()
		})
	}

	// every 5 mins, sync gitlab user
	brain.schedule("gitlab-issues", "*/5 * * * *", fire)

	fire()
	cb()
}
