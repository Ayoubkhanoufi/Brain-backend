const URL = require("url");
const https = require("https");
const pretty = require('prettyjson');
const debug = require('debug')('brain:Gitlab');
const crypto = require("crypto");
const utils = require("./utils");

class Gitlab {
		constructor(brain, config, error) {
			this.error = error;
			this.config = config;
			this.url = URL.parse(this.config.host);
			this.client = brain.redis;

			debug('Running Pulse Brain - Gitlab NodeJS connector: '+this.config.host);
		}

		copyPage(opts, next, assign) {
			const text = opts.text;
			const db = opts.db;
			const route = opts.route;
			const cache = opts.cache||false;
	
			const self = this;
	
			var revalidate = false;
			
			function page(num) {
				debug(text+" page #"+num);
				self.get(route, {scope: "all", page:num}, (err, items) => {
					if(!items ||items.length == 0) {
						if(next) next();
						return;
					}
	
					utils.eachArray(items, (index, value, nextItem, last) => {
						if(last === true) {
							process.nextTick(page, num+1);
							return;
						}
	
						if(opts.beforeUpdate) {
							opts.beforeUpdate(value, () => {
								db.updateOne({id: value.id}, value, {upsert: true}, (err) => {
									nextItem();
								})
							})
						}
						else {
							db.updateOne({id: value.id}, value, {upsert: true}, (err) => {
								nextItem();
							})
						}
					})
				}, {cache: cache, revalidate: revalidate});
			}
			page(1)
		}

		clean(tab) {
			for(var a in tab) {
				var p = tab[a];
				if(p == undefined)
					delete tab[a];
			}
		}

		revalidate(hash) {
			this.client.set(hash, "!");
		}

		rawRequest(options, cb, request) {
			var self = this;

			const hash = crypto.createHash("sha1");
			hash.update(JSON.stringify(options))
			const hashKey = hash.digest("hex")

			debug(`Running cache=${options.cache} ${options.method} ${options.path}`)

			function tx() {
				// send request
				const req = https.request(options, (res) => {

					// bufferize
					var buffer = '';
					res.on('data', (d) => {
						buffer += d;
					});

					res.on('end', (d) => {
						try {
							var json = JSON.parse(buffer);
						} catch(e) {
							var err = {code: res.statusCode, msg: "Error parsing JSON: "+e.message};
							self.error(err);
							cb(err);
							return;
						}

						// store in redis
						if(options.cache === true) {
							const place = {
								key: hashKey,
								last: new Date,
								age: 60*60*24,
								data: json,
							}
							self.client.set(hashKey, JSON.stringify(place), 'EX', place.age)
						}

						// sleeping return
						if(options.sleep > 0) {
							setTimeout(() => {
								cb(null, json, hashKey)
							}, options.sleep)
						}
						else cb(null, json, hashKey)
					});
				});

				req.on('error', (e) => {
					var err = {code: -1, msg: "Error processing request: "+e.message};
					self.error(err);
					cb(err);
				});

				if(request) request(req);
			}

			// check from cache
			if(options.cache === true && options.revalidate !== true) {
				this.client.get(hashKey, function(err, reply) {
					if(reply) {
						try {
							cb(null, JSON.parse(reply).data, hashKey)
						} catch(e) {
							tx();
						}
					}
					else {
						tx();
					}
				});
			}
			else {
				tx();
			}
		}

		buildParams(params) {
			var path = '';
			// build params
			if(params) {
				var pc = 0;

				for(var a in params) {
					if(pc == 0)
						path += "?"
					if(pc >= 1)
						path += '&';
					//path += a+'='+encodeURIComponent(params[a]);
					path += a+'='+params[a];
					pc++;
				}
			}
			return(path)
		}

		get(rcs, params, cb, opts, method) {
			var self = this;
			var path = this.url.path+rcs;

			path += this.buildParams(params);
			method = method||'GET';

			if(!opts) opts = {}

			

			// create http options
			var options = {
					cache: opts.cache,
					revalidate: opts.revalidate,
					sleep: opts.sleep,

					protocol: this.url.protocol,
					host: this.url.host,
					port: this.url.port,
					path: path,
					method: method,
					headers: {
						'User-Agent': "Pulse Brain - Gitlab NodeJS connector v0.1",
						'Accept': 'application/json',
						'PRIVATE-TOKEN': this.config.token
					}
			};

			this.rawRequest(options, cb, (req) => { req.end() })
		}

		post(rcs, params, cb, cache) {
			this.get(rcs, params, cb, cache, "POST");
		}

		put(rcs, params, cb, opts, cache) {
			var self = this;
			var path = this.url.path+rcs;
			var params = JSON.stringify(params);

			if(!opts) opts = {}

			// create http options
			var options = {
				cache: opts.cache,
				revalidate: opts.revalidate,
				sleep: opts.sleep,

				protocol: this.url.protocol,
				host: this.url.host,
				port: this.url.port,
				path: path,
				method: 'PUT',
				headers: {
					'User-Agent': "Pulse Brain - Gitlab NodeJS connector v0.1",
					'Accept': 'application/json',
					'Content-Type': 'application/json',
					'PRIVATE-TOKEN': this.config.token,
					'Content-Length': Buffer.byteLength(params, 'utf8')
				}
			};

			this.rawRequest(options, cb, (req) => {
				req.write(params);
				req.end();
			})

		}

}


module.exports = Gitlab;
