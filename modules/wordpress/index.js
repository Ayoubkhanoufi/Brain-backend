const debug = require("debug")("brain:wordpress");

module.exports = (brain, cb) => {

	if(typeof brain.options.wordpress != "object") {
		debug("Skipping Wordpress bot commands");
		return(cb());
	}

	brain.lazydb.$register("deploys", {
		name: String,
		id: Number,
		env: String,
		projectId: String,
		state: String
	});

	// dead code atm
	var ref = 3;
	function deref() {
		ref--;
		if(ref == 0 && cb) cb();
	}

	// load bot commands
	require("./bot/install.js")(brain, deref);
	require("./bot/deploy.js")(brain, deref);
	require("./bot/update.js")(brain, deref);
}
