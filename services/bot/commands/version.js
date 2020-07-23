const pkg = require("../../../package.json");

module.exports = (brain, cb) => {
	brain.bot.on("version", (args, end) => {
		args.reply("@"+args.note.author.username+" here is my current version **"+pkg.name+"/"+pkg.version+"**", end);
	}, "Get Brain Jarvis version")
	cb();
}
