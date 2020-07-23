const debug = require('debug')('brain:wordpress:bot:update');
const fs = require("fs");
const { exec } = require('child_process');
const utils = require("../../../lib/utils");
const git = require("../../../lib/git");
const jen = require("node-jen")(false);
const request = require('request')

const lib = require("../lib")

module.exports = (brain, cb) => {

	brain.bot.on("pulse wordpress update", (args, end) => {
		const data = { note: args.note }

		var perm = brain.bot.permission(args.note.author.username, "admin")
		if (perm !== true) {
			args.reply("@" + args.note.author.username + ", You don't have enought of permissions to perform this command", end);
			return;
		}

		var buffer = `@${args.note.author.username}, Update completed!\n`

		utils.sync([
			// get project
			(next) => {
				brain.lazydb.gitlabProjects.findOne({ id: args.project }).lean().exec((err, project) => {
					if (!project) {
						console.log("Project not found");
						args.reply("@" + args.note.author.username + `, project not found`, end);
						return;
					}

					data.project = project;
					data.projectRepo = "brain-" + data.project._id
					data.path = brain.options.tmpDir + "/" + data.projectRepo;

					next();
				})
			},

			// get project
			(next) => {
				data.git = new git({
					path: brain.options.tmpDir,
					name: data.projectRepo,
					url: data.project.ssh_url_to_repo
				}, () => {
					debug("Cloning done for " + data.project.ssh_url_to_repo);
					data.git.pull(next)
				});
			},

			// load project information
			(next) => {
				fs.readFile(data.path + "/.brain.json", (err, str) => {
					if (err) {
						args.reply("@" + args.note.author.username + ", can not load .brain.json", end);
						return;
					}

					try {
						data.brain = JSON.parse(str.toString())
					} catch (e) {
						args.reply("@" + args.note.author.username + ", parse error in **.brain.json**: " + e.message, end);
						return;
					}

					if (data.brain.tech != "wordpress") {
						args.reply("@" + args.note.author.username + ", invalid technology for this command", end);
						return;
					}

					next()
				})
			},

			// get wordpress
			(next) => {
				buffer += "* Updating wordpress from https://wordpress.org/latest.tar.gz\n"
				exec('cd ' + brain.options.tmpDir + '; rm -rf ./wordpress; curl -o ./wordpress.tgz https://wordpress.org/latest.tar.gz; tar zxfv ./wordpress.tgz', (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						end();
						return;
					}
					next();
				})
			},

			// sync source
			(next) => {
				exec('rsync -a ' + brain.options.tmpDir + '/wordpress/ ' + data.path, (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						end();
						return;
					}
					next();
				})
			},

			(next) => {
				buffer += "\nUpdating a list of specific sources:\n";
				utils.eachArray(lib.plugins, (index, toSync, nextItem, last) => {
					if (last === true) {
						next();
						return;
					}

					const work = {}
					utils.sync([
						// chargement du git
						(next) => {

							if (toSync.git) {
								debug("Cloning GIT " + toSync.git);

								buffer += "* GIT **" + toSync.name + "**\n";

								work.git = new git({
									path: brain.options.tmpDir,
									name: toSync.name,
									url: toSync.git
								}, () => {
									debug("Cloning done for " + toSync.git);
									work.path = work.git.options.directory;
									work.git.pull(next)
								});
							}
							else {
								debug("Cloning ZIP " + toSync.zip);

								buffer += "* ZIP **" + toSync.name + "**\n";

								work.path = `${brain.options.tmpDir}/${toSync.name}`;
								const cmds = [
									`rm -rf ${work.path}`,
									`cd ${brain.options.tmpDir}`,
									`curl '${toSync.zip}' -o ${work.path}.zip`,
									`unzip ${work.path}.zip -d ${work.path}`,
								]

								exec(cmds.join('; '), (error, stdout, stderr) => {
									if (error) {
										console.error(`exec error: ${error}`);
										end();
										return;
									}

									if (toSync.zipPath) work.path += "/" + toSync.zipPath;

									next();
								})
							}

						},

						// copy directory
						(next) => {
							exec(`rsync -a ${work.path}/ ${data.path}/${toSync.directory} --exclude .git --delete`, (error, stdout, stderr) => {
								if (error) {
									console.error(`exec error: ${error}`);
									end();
									return;
								}
								next();
							})

						},
					], nextItem)

				});
			},

			// commit all the work
			(next) => {
				data.git.addAll(() => {
					data.git.commit("Global Wordpress update requested by @" + args.note.author.username, () => {
						data.git.push(() => {
							next();
						})
					})
				})
			}
		], () => {
			args.reply(buffer, end);
		})
	}, "Update the current Wordpress installation");

	cb()
}
