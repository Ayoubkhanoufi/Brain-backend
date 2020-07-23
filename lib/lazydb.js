const mongoose = require('mongoose')
const debug = require('debug')('brain:lib:lazydb');

class lazydb {
	constructor(options) {

		// default increase pool
		options.poolSize = options.poolSize || 10;
		options.reconnectTries = options.reconnectTries || Number.MAX_VALUE;
		options.reconnectInterval = options.reconnectInterval || 1000;

		this.options = options;
	}

	$register(name, usc) {
		debug("Creating lazy schemas for "+name);
		if(!usc)
			usc = {}
		var sc = new mongoose.Schema(usc, {
			timestamps: {
				createdAt: 'brainCreatedAt',
				updatedAt: 'brainUpdatedAt'
			},
			strict: false
		});
		this[name] = this._db.model(
			name,
			sc
		);
	}

	$startDatabase(status) {
		const self = this;
		const options = this.options;

		// connection
		function fireStarter() {
			debug("Connecting to database "+options.url+'...');
			self._db = mongoose.createConnection(options.url, { useNewUrlParser: true }, (error) => {
				debug("Connection to database established");
				if(status)
					status()
			});
			self._db.on('error', function(err) {
				console.log("Connection lost with database "+options.url);
				console.log("Retrying in "+options.reconnectInterval);
				setTimeout(fireStarter, options.reconnectInterval);
			});

		}

		// first connect
		fireStarter();
	}
}

module.exports = lazydb;
