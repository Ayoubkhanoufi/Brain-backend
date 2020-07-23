const utils = require("../../../lib/utils");

module.exports = (brain, cb) => {
	brain.bot.on("hello", (args, end) => {

		utils.sync([
			//(next) => { args.addNote("let me add a pre note!", next); },
			(next) => { args.reply("Hello @"+args.note.author.username+", hope you well!", next); },
			//(next) => { args.addNote("let me add a post note!", next); },
		], () => {
			end();
		})

	}, "Hello echo test message")

	cb();
}
