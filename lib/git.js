const utils = require("./utils");
const { exec } = require('child_process');
const fs = require("fs");
const debug = require('debug')('brain:git');

class git {
	constructor(opts, cb) {
		this.options = opts;
		opts.directory = opts.path+"/"+opts.name;

		utils.sync([
			// clone repo
			(next) => {
				fs.stat(opts.directory, (err, stat) => {
					// need update
					if(!err) {
						next();
					}
					// need clone
					else {
						debug("Cloning "+opts.url+" under "+opts.name)
						exec('cd '+opts.path+"; git clone "+opts.url+" "+opts.name, (error, stdout, stderr) => {
							if (error) {
								console.error(`exec error: ${error}`);
								cb(error);
								return;
							}
							next();
						})
					}
				})
			},

			// fix local configuration
			(next) => {
				exec('cd '+opts.directory+'; git config --local user.name "Jarvis"; git config --local user.email "demandes@pulse.digital"', (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						cb(error);
						return;
					}
					next();
				})
			},

		], cb)

	}

	init(cb) {
		exec('cd '+this.options.directory+"; git init", (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				cb(error);
				return;
			}
			cb();
		})
	}

	checkForInitial(result) {
		exec('cd '+this.options.directory+"; git log | wc -l", (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				result(error);
				return;
			}

			// need to run initial commit
			if(stdout == 0) {
				result(true);
			}
			else {
				result(false);
			}
		})
	}

	pull(cb) {
		exec('cd '+this.options.directory+"; git pull", (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				cb(error);
				return;
			}
			cb();
		})
	}

	commit(msg, cb) {
		debug("Commit in "+this.options.url+" > "+this.options.name+": "+msg)
		exec('cd '+this.options.directory+"; git commit -a -m '"+msg+"'", (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				cb(error);
				return;
			}
			cb();
		})
	}

	pushOrigin(branch, cb) {
		debug("Push origin in "+this.options.url+" > "+this.options.name+": to branch "+branch)
		exec('cd '+this.options.directory+"; git push origin "+branch, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				cb(error);
				return;
			}
			cb();
		})
	}

	push(cb) {
		debug("Push in "+this.options.url+" > "+this.options.name)
		exec('cd '+this.options.directory+"; git push", (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				cb(error);
				return;
			}
			cb();
		})
	}

	add(file, cb) {
		debug("Add specific file in "+this.options.url+" > "+this.options.name+": "+file)
		exec('cd '+this.options.directory+"; git add "+file, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				cb(error);
				return;
			}
			cb();
		})
	}

	addAll(cb) {
		debug("Add all files in "+this.options.url+" > "+this.options.name)
		exec('cd '+this.options.directory+"; git add */.*; git add *", (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				cb(error);
				return;
			}
			cb();
		})
	}


	fetch(cb) {
		debug("Fetching Git "+this.options.url+" > "+this.options.name)
		exec('cd '+this.options.directory+"; git fetch", (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				cb(error);
				return;
			}
			cb();
		})
	}

	checkout(branch, cb) {
		debug("Checkout Git "+branch+" from "+this.options.url+" > "+this.options.name)
		exec('cd '+this.options.directory+"; git checkout "+branch, (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				cb(error);
				return;
			}
			cb();
		})
	}

}

module.exports = git;
