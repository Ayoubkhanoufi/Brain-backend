
module.exports = (brain, cb) => {
	brain.bot.on("help", (args, end) => {
		var buffer = "Hey @"+args.note.author.username+", here the commands i support!\n\n"+
			"```\n"

		// compute biggest command
		var biggest = 0;
		for(var a in brain.bot._botcmds) {
			const cmd = brain.bot._botcmds[a];
			if(cmd.cmd.length > biggest) biggest = cmd.cmd.length;
		}

		for(var a in brain.bot._botcmds) {
			const cmd = brain.bot._botcmds[a];
			var line = "- "+
				" ".repeat(biggest-cmd.cmd.length)+cmd.cmd+" : "+
				cmd.doc+"\n";
			buffer += line;
		}
		buffer += "```\n"

		args.reply(buffer, end);
	}, "Get helps")

	cb();
}
