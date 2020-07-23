const debug = require('debug')('brain:bot:wordpress');
const ejs = require("ejs");
const pkg = require("../../../package.json");
const fs = require("fs");
const { exec } = require('child_process');
const utils = require("../../../lib/utils");
const git = require("../../../lib/git");
const tmpDir = "/tmp";

module.exports = (brain, cb) => {
	brain.bot.on("pulse templates", (args, end) => {
		const data = {note: args.note}
		var initialGit = true;

		var perm = brain.permission(args.note.author.username, "admin")
		if(perm !== true) {
			args.reply("@"+args.note.author.username+", You don't have enought of permissions to perform this command", end);
			end();
			return;
		}

		var buffer = "@"+args.note.author.username+", I have just setup Gitlab Templates installation, check the repository\n"

		//
		utils.sync([
			// get project
			(next) => {
				brain.lazydb.gitlabProjects.findOne({id: args.project}).lean().exec((err, project) => {
					if(!project) {
						console.log("Project not found");
						args.reply(`@${args.note.author.username} the project is actually not a brain instance, need installation?`, end);
						return;
					}

					buffer += "* Selecting project "+project.name+"\n"
					data.project = project;

					data.projectRepo = "brain-"+data.project._id
					data.path = tmpDir+"/"+data.projectRepo;

					next();
				})
			},

			// get lead projects
			(next) => {
				data.projectGit = new git({
					path: tmpDir,
					name: "lead-issue-templates",
					url: "git@git.pulse.digital:lead/issue-templates.git"
				}, () => {
					debug("Cloning done for git@git.pulse.digital:lead/issue-templates.git");


					data.projectGit.pull(next)
				});
			},

			// get project
			(next) => {
				data.git = new git({
					path: tmpDir,
					name: data.projectRepo,
					url: data.project.ssh_url_to_repo
				}, () => {
					debug("Cloning done for "+data.project.ssh_url_to_repo);
					next();
				});
			},

			(next) => {
				data.git.checkForInitial((isNew) => {
					if(isNew == true) {
						fs.writeFileSync(data.path+"/.brain.json", "{}");

						data.git.add(".brain.json", () => {
							data.git.commit("Initial Pulse Templates Installation Requested by @"+args.note.author.username, () => {
								data.git.pushOrigin("master", () => {
									next();
								})
							})
						})
					}
					else {
						data.git.pull(next)
					}
				});
			},

			// sync repo
			(next) => {
				exec('rsync -a '+data.projectGit.options.directory+'/ '+data.git.options.directory+"/.gitlab --exclude /.git --delete", (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						end();
						return;
					}
					next();
				})
			},

			// apply ejs template
			(next) => {
				utils.template(
					data.projectGit.options.directory,
					data.git.options.directory+"/.gitlab",
					data,
					next
				);
			},

			// commit push works
			(next) => {
				data.git.addAll(() => {
					data.git.commit("Updated Gitlab Templates Files Requested by @"+args.note.author.username, () => {
						data.git.push(() => {
							next();
						})
					})
				})
			},

		], () => {
			args.reply(buffer, end);
		})



	}, "Install or update gitlab templates")
	cb();
}
