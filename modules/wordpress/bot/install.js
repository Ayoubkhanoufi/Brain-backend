const debug = require('debug')('brain:wordpress:bot:install');
const fs = require("fs");
const ejs = require("ejs");
const { exec } = require('child_process');
const utils = require("../../../lib/utils");
const git = require("../../../lib/git");
const jen = require("node-jen")(false);
const request = require('request')

const lib = require("../lib")

module.exports = (brain, cb) => {

	brain.bot.on("pulse wordpress install", (args, end) => {

		const data = {note: args.note}
		var initialGit = true;

		var perm = brain.bot.permission(args.note.author.username, "admin")
		if(perm !== true) {
			args.reply("@"+args.note.author.username+", You don't have enought of permissions to perform this command", end);
			end();
			return;
		}

		// sanatize projectname
		if(args.args.length == 0) {
			args.reply("@"+args.note.author.username+", Please provide a valid project name please: @brain wordpress myprojectname", end);
			end();
			return;
		}
		data.projectName = args.args.replace(" ", "-");

		var buffer = "@"+args.note.author.username+", I have just spawn a new and fresh Wordpress installation, check that out!\n"

		//
		utils.sync([
			// get project
			(next) => {
				brain.lazydb.gitlabProjects.findOne({id: args.project}).lean().exec((err, project) => {
					if(!project) {
						console.log("Project not found");
						end();
					}

					buffer += "* Selecting project "+project.name+"\n"
					data.project = project;

					data.projectRepo = "brain-"+data.project._id
					data.path = brain.options.tmpDir+"/"+data.projectRepo;

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
					debug("Cloning done for "+data.project.ssh_url_to_repo);
					data.git.pull(next)
				});
			},

			(next) => {
				data.git.checkForInitial((isNew) => {
					//if(isNew == true) {
						fs.writeFileSync(data.path+"/.brain.json", "{}");

						data.git.add(".brain.json", () => {
							data.git.commit("Initial Wordpress installation requested by @"+args.note.author.username, () => {
								data.git.pushOrigin("master", () => {
									next();
								})
							})
						})
/*
					}
					else {
						data.git.pull(next)
					}
*/
				});
			},

			// prepare branches and project configuration
			(next) => {
				const subdata = {};

				utils.sync([
					(next2) => {
						// prepare branches
						const route = `/projects/${args.project}/repository/branches`;
						brain.gitlab.get(route, {per_page: 100}, (err, branches, hash) => {
							var developFound = false;

							// check if develop branche exists
							for(var a in branches) {
								const branch = branches[a];
								if(branch.name == "develop") {
									developFound = true;
									break;
								}
							}

							if(developFound !== true) {
								const opts = {
									branch: "develop",
									ref: "master"
								}
								brain.gitlab.post(`/projects/${args.project}/repository/branches`, opts, (err, config, hash) => {
									next2();
								});
							}
							else {
								next2();
							}
						});
					},

					// respawn git repo
					(next) => {
						data.git.fetch(() => {
							data.git.checkout("develop", next)
						})
					},

					// run configuration
					(next2) => {
						const projectConfiguration = {
							default_branch: 'develop',
							merge_requests_enabled: true,
							merge_method: "ff",
							wiki_enabled: false,
							lfs_enabled: true,
							auto_devops_enabled: true,
							auto_devops_deploy_strategy: "continuous",
							packages_enabled: false,
							only_allow_merge_if_pipeline_succeeds: true,
							only_allow_merge_if_all_discussions_are_resolved: true,
						}

						brain.gitlab.get(`/projects/${args.project}`, {}, (err, config, hash) => {

							if(!config.description) {
								projectConfiguration.description = "Merci de compléter la description du projet"
							}

							brain.gitlab.put(`/projects/${args.project}`, projectConfiguration, (err, config, hash) => {
								next2();
							});
						});
					},

					// create labels
					(next) => {
						utils.eachArray(lib.labels, (index, label, nextItem, last) => {
							if(last === true) {
								next();
								return;
							}

							brain.gitlab.post(`/projects/${args.project}/labels`, label, (err, config, hash) => {
								nextItem();
							});
						})
					},

/*
					// pour le moment il a un soucis avec les API de gitlab sur le board
					(next) => {
						// GET /projects/:id/boards

						brain.gitlab.get(`/projects/${args.project}/boards`, {}, (err, boards, hash) => {
							if(!boards || boards.length == 0) {
								next();
								return;
							}

							const nList = [];
							const board = boards[0];
							console.log(board);
							for(var a in lib.labels) {
								if(lib.labels[a].position !== undefined) {
									nList.push(lib.labels[a])
								}
							}
							nList.sort((a, b) => {
								return(a.position-b.position)
							})

							brain.gitlab.post(`/projects/${args.project}/boards`, {
								name: "Development Flux",
								labels: nList.join(',')
							}, (err, ret, hash) => {
								console.log(ret);
							})

						});

					}
					*/

				], next)
			},

			// load brain info et check if installation
			(next) => {
				data.config = require(data.path+"/.brain.json");

				if(data.config.tech) {
					args.reply("@"+args.note.author.username+", i can not install wordpress because a tech is already defined in .brain.json, could please check that out", end);
					return;
				}

				next();
			},

			// get wordpress
			(next) => {
				buffer += "* Installing wordpress from https://wordpress.org/latest.tar.gz\n"
				exec('cd '+brain.options.tmpDir+'; rm -rf ./wordpress; curl -o ./wordpress.tgz https://wordpress.org/latest.tar.gz; tar zxfv ./wordpress.tgz', (error, stdout, stderr) => {
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
				exec('rsync -a '+brain.options.tmpDir+'/wordpress/ '+data.path, (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						end();
						return;
					}
					next();
				})
			},

			// chargement des git externes
			(next) => {
				buffer += "\nUpdating a list of specific sources:\n";
				utils.eachArray(lib.plugins, (index, toSync, nextItem, last) => {
					if(last === true) {
						next();
						return;
					}

					const work = {}
					utils.sync([
						// chargement du git
						(next) => {

							if(toSync.git) {
								debug("Cloning GIT "+toSync.git);

								buffer += "* GIT **"+toSync.name+"**\n";

								work.git = new git({
									path: brain.options.tmpDir,
									name: toSync.name,
									url: toSync.git
								}, () => {
									debug("Cloning done for "+toSync.git);
									work.path = work.git.options.directory;
									work.git.pull(next)
								});
							}
							else {
								debug("Cloning ZIP "+toSync.zip);

								buffer += "* ZIP **"+toSync.name+"**\n";

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

									if(toSync.zipPath) work.path += "/"+toSync.zipPath;
									
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

			// copy files into repo
			(next) => {
				jen.hardening(false);
				data.brain = {
					name: data.projectName,
					project: data.project.id,
					tech: "wordpress",
					data: new Date,
					env: {
						dev: {
							deploy_domain: "wp-"+data.projectName+".dev.pulse.digital",
							db_user: "wp-"+data.project.id+"-dev",
							db_password: jen.password(25),
							admin_password: jen.password(20),
							key: {
								auth: jen.password(64),
								secure_auth: jen.password(64),
								logged_in: jen.password(64),
								nonce: jen.password(64),
							},
							salt: {
								auth: jen.password(64),
								secure_auth: jen.password(64),
								logged_in: jen.password(64),
								nonce: jen.password(64),
							}
						},
						prod: {
							deploy_domain: data.projectName+".prod.pulse.digital",
							db_user: "wp-"+data.project.id+"-prod",
							db_password: jen.password(25),
							admin_password: jen.password(20),
							key: {
								auth: jen.password(64),
								secure_auth: jen.password(64),
								logged_in: jen.password(64),
								nonce: jen.password(64),
							},
							salt: {
								auth: jen.password(64),
								secure_auth: jen.password(64),
								logged_in: jen.password(64),
								nonce: jen.password(64),
							}
						}
					}
				}

console.log(data.path+"/.brain.json", data.brain)
				fs.writeFileSync(data.path+"/.brain.json", JSON.stringify(data.brain,null,'\t'));

				next();
			},

			// apply ejs template
			(next) => {
				utils.template(
					__dirname+"/../templates/dev",
					data.path,
					data,
					next
				);
			},

			// commit all the work
			(next) => {
				data.git.addAll(() => {
					data.git.commit("Tunned Wordpress files requested by @"+args.note.author.username, () => {
						data.git.push(() => {
							next();
						})
					})
				})
			}
		], () => {
			args.reply(buffer, end);
		})



	}, "Install fresh Wordpress instance")

	cb();
}
