const fs = require("fs");
const ejs = require("ejs");
const debug = require('debug')('brain:utils');

const acceptTemplate = /\.(md|yml|gitignore|css|js|php|htaccess)$/i

class utils {
	eachArray(list, executor) {
		var index = 0;
		if(!Array.isArray(list)) return(executor(null, null, null, true))
		function next() {

			var o = list[index];
			if(o === undefined) {
				executor(null, null, null, true)
				return;
			}
			index++;
			executor(index, o, next, false)
		}

		process.nextTick(next);
	}

	eachObject(objs, executor) {
		var aObjects = [];

		// transpose objets to array
		for (var a in objs)
			aObjects.push([a, objs[a]]);

		function next() {
			var o = aObjects.shift();
			if (o === undefined) {
				executor(null, null, next, true)
				return;
			}
			executor(o[0], o[1], next, false)
		}

		process.nextTick(next);
	}

	sync(list, finish) {
		function next(index) {
			var exec = list[index];
			if(exec === undefined) {
				if(finish) finish()
				return;
			}
			exec(() => {
				index++;
				process.nextTick(next, index);
			}, exec)
		}
		process.nextTick(next, 0);
	}

	mkdirDeep(dir) {
		var stage = '';
		var tab = dir.split("/");
		tab.pop();

		for(var a = 1; a<tab.length; a++) {
			stage += '/'+tab[a];
			try  {
				try {
					var fss = fs.statSync(stage);
				} catch(a) {
					fs.mkdirSync(stage);
				}
			}
			catch(e) {
				console.error('* Error: can not create '+dir);
				return(false);
			}
		}
		return(true);
	};


	template(dir, dst, data, end) {
		const self = this;
		debug("Templating: "+dir+" "+dst);
		fs.readdir(dir, (err, dirs) => {
			this.eachArray(dirs, (index, ddir, nextItem, last) => {
				if(last === true) {
					end();
					return;
				}

				fs.stat(dir+"/"+ddir, (err, stat) => {
					if(err) {
						nextItem();
						return;
					}

					if(stat.isDirectory()) {
						fs.mkdir(dst+"/"+ddir, () => {
							self.template(dir+"/"+ddir, dst+"/"+ddir, data, () => {
								nextItem();
							});
						})
					}
					else if(acceptTemplate.test(ddir)) {
						ejs.renderFile(dir+"/"+ddir, data, {}, function(err, str) {
							//buffer += "* Templating "+dst+"/"+ddir+"\n"
							fs.writeFile(dst+"/"+ddir, str, () => {
								nextItem();
							})
						});
					}
					else {
						nextItem();
					}

				})
			})
		})
	}

	singleTemplate(src, dst, data) {
		const content = ejs.render(
			fs.readFileSync(src).toString(),
			data
		)

		this.mkdirDeep(dst)

		fs.writeFileSync(dst, content)
	}

	datesec(num) {
		const split = num.match(/([0-9]+)([mhdw])/)
		var ret = 0;
		if(split) {
			const n = parseInt(split[1]);
			const mod = split[2];

			if(mod == 'm') ret = n*60;
			else if(mod == 'h') ret = n*60*60;
			else if(mod == 'd') ret = n*60*60*8;
			else if(mod == 'w') ret = n*60*60*8*5;
		}

		return(ret);
	}

	fixzero(num) {
		if(num < 10) return('0'+num)
		return(''+num)
	}
}


module.exports = new utils;
