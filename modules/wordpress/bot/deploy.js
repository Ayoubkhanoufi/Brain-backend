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

	brain.bot.on("pulse wordpress deploy", (args, end) => {

		const data = {note: args.note}

		var perm = brain.bot.permission(args.note.author.username, "admin")
		if(perm !== true) {
			args.reply("@"+args.note.author.username+", You don't have enought of permissions to perform this command", end);
			return;
		}

		// sanatize projectname
		if(args.args.length == 0) {
			args.reply("@"+args.note.author.username+", Please provide a valid project name please: @brain wordpress myprojectname", end);
			return;
		}
		data.env = args.args.replace(" ", "-");

		if(data.env != "dev") {
			args.reply("@"+args.note.author.username+", I don't know the **"+data.env+"**, please change", end);
			return;
		}

		utils.sync([
			// get project
			(next) => {
				brain.lazydb.gitlabProjects.findOne({id: args.project}).lean().exec((err, project) => {
					if(!project) {
						console.log("Project not found");
						args.reply(`@${args.note.author.username} the project is actually not a brain instance, need installation?`, end);
						return;
					}

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

			// get lead projects
			(next) => {
				data.projectGit = new git({
					path: brain.options.tmpDir,
					name: "lead-projects",
					url: "git@git.pulse.digital:lead/projects.git"
				}, () => {
					debug("Cloning done for git@git.pulse.digital:lead/projects.git");
					data.projectGit.pull(next)
				});
			},

			// load project information
			(next) => {
				fs.readFile(data.path+"/.brain.json", (err, str) => {
					if(err) {
						args.reply("@"+args.note.author.username+", can not load .brain.json", end);
						return;
					}

					try {
						data.brain = JSON.parse(str.toString())
					} catch(e) {
						args.reply("@"+args.note.author.username+", parse error in **.brain.json**: "+e.message, end);
						return;
					}

					if(data.brain.tech != "wordpress") {
						args.reply("@"+args.note.author.username+", invalid technology for this command", end);
						return;
					}

					next()
				})
			},

			// now check if we can generate environnement files
			(next) => {
				brain.lazydb.deploys.findOne({
					env: data.env,
					projectId: data.project.id
				}).lean().exec((err, deploy) => {
					if(!deploy) {
						console.log("Need to create deploy environnement: "+data.env+" for project "+data.project.id);
						data.toCreate = true;

						// find an valid ID entry
						brain.lazydb.deploys.findOne({
							env: data.env,
						}).sort({id: -1}).lean().exec((err, last) => {
							if(!last) data.systemId = lib.minimumId;
							else data.systemId = last.id+1;

							// create new entry
							const n = new brain.lazydb.deploys({
								id: data.systemId,
								env: data.env,
								projectId: data.project.id
							})
							n.save(next)
						})
					}
					else {
						data.toCreate = false;
						data.systemId = deploy.id;
						next();
					}
				})
			},

			// clean project directory
			(next) => {
				data.projectPath = data.projectGit.options.directory+"/projects/gitlab-"+data.project.id;
				exec('rm -rf '+data.projectPath, (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						end();
						return;
					}
					next();
				})
			},

			// reploy all environment into lead projects
			(next) => {
				if(!data.brain.env[data.env]) {
					args.reply("@"+args.note.author.username+", Can not found the environment : "+data.env+" in .brain.json", end);
					return;
				}

				brain.lazydb.deploys.find({
					projectId: data.project.id
				}).lean().exec((err, envs) => {
					data.envs = envs;

					// prepare environments
					utils.eachArray(envs, (index, item, nextItem, last) => {
						if(last === true) {
							next();
							return;
						}

						data.envSettings = data.brain.env[item.env];
						if(!data.envSettings) {
							console.log("No setting (.brain.json) for "+item.env+" for project "+data.project.id);
							nextItem();
							return;
						}

						data.envFile = data.projectPath+"/vars/"+item.env+".yml";
						utils.singleTemplate(
							__dirname+"/../templates/ops/config.yml",
							data.envFile,
							data
						)

						nextItem();
					});
				});
			},

			// create tech dep main
			(next) => {
				data.envFile = data.projectPath+"/main.yml";
				utils.singleTemplate(
					__dirname+"/../templates/ops/main.yml",
					data.envFile,
					data
				)
				next();
			},

			// gitlab ci
			(next) => {
				data.envFile = data.projectPath+"/gitlab-ci.yml";
				utils.singleTemplate(
					__dirname+"/../templates/ops/gitlab-ci.yml",
					data.envFile,
					data
				)
				next();
			},

			// generate main gitlab ci
			(next) => {
				const dirs = fs.readdirSync(data.projectGit.options.directory+"/projects");

				data.envFile = data.projectGit.options.directory+"/.gitlab-ci.yml";
				data.allDirs = dirs;
				utils.singleTemplate(
					__dirname+"/../templates/ops/main-gitlab-ci.yml",
					data.envFile,
					data
				)
				next();
			},

			// commit push works
			(next) => {
				data.projectGit.addAll(() => {
					data.projectGit.commit("Deploying Project "+data.project.name_with_namespace+" Requested by @"+args.note.author.username, () => {
						data.projectGit.push(() => {
							next();
						})
					})
				})
			},

			// run ansible now
			(next) => {
				debug("Installing CICD could take look");
				const cmds = [
					`cd ${data.projectGit.options.directory}`,
					`ansible-playbook -i /etc/ansible/environments/${data.env} ./projects/gitlab-${data.project.id}/main.yml`
				]
				exec(cmds.join(';'), (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						end();
						return;
					}
					next();
				})
			},

			// run ansible on current directory
			(next) => {
				debug("Running Ansible on project");
				const cmds = [
					`cd ${data.git.options.directory}`,
					`mkdir -p /stage/gitlab-${data.project.id}`,
					`rsync -a --delete ./ /stage/gitlab-${data.project.id}`,
					`ansible-playbook -i /etc/ansible/environments/${data.env} .cicd/sync.yml`
				]

				exec(cmds.join(';'), (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						end();
						return;
					}
					next();
				})
			},

			// install wordpress
			// register admin password
			(next) => {

				const opts = {
					url: `https://${data.envSettings.deploy_domain}/wp-admin/install.php?step=2`,
					form: {
						weblog_title: data.project.description,
						user_name: "admin",
						admin_password: data.envSettings.admin_password,
						'pass1-text': data.envSettings.admin_password,
						admin_password2: data.envSettings.admin_password,
						admin_email: 'demandes@pulse.digital',
						Submit: 'Installer WordPress',
						language: 'fr_FR'
					}
				}
				request.post(opts, next)
			}
		], () => {
			args.reply("@"+args.note.author.username+`, Deploy completed! Try https://${data.envSettings.deploy_domain}`, end);
		})

	}, "Deploy the current Brain project instance")

	cb();
}
