const debug = require("debug")("brain:bot");
const utils = require("../../lib/utils");
const fs = require("fs");

class bot {
    constructor(brain) {
        this.brain = brain;
        debug('Loading bot object')
    }

    on(cmd, exec, doc) {
        if (!this._botcmds) this._botcmds = []
        this._botcmds.push({ cmd: cmd, exec: exec, doc: doc });

        this._botcmds.sort(function (a, b) {
            return b.cmd.length - a.cmd.length;
        });
    }

    permission(user, role) {
        const roles = this.brain.options.roles;
        if (!roles[role]) return (false);
        if (roles[role][user] === true) return (true);
        return (false);
    }

    load(next) {
        debug("Loading base bot commands");

        const source = __dirname + '/commands';
        const dirs = fs.readdirSync(source);

        utils.eachArray(dirs, (index, dir, nextItem, last) => {
            if (last === true) {
                this.startSchedule()
                next();
                return;
            }

            if (/\.js$/.test(dir)) {
                debug("Loading basic Bot command at " + source + '/' + dir)
                try {
                    const fct = require(source + '/' + dir);
                    fct(this.brain, nextItem)
                } catch (e) {
                    console.log(e)
                    process.exit(-1)
                }
            }
            else {
                nextItem();
            }
        });
    }

    startSchedule() {
        const self = this;
        function fire(cb) {
            self.getMyMessages(cb)
        }

        fire(() => {
            this.brain.schedule("bot-command", "* * * * * *", fire)
        })
    }

    getMyMessages(cb) {
        const self = this.brain;
        const term = "@" + self.options.me
        const matcher = new RegExp(term);

        const finder = self.lazydb.gitlabDiscussions.find({
            "notes.body": matcher
        }).populate("issueId");

        self.mongoPage(finder, (item, next) => {
            
            // parse lines from the first notes line
            // acutally the system does not work on reply
            if (item.notes.length > 0) {
                const lines = item.notes[0].body.split("\n");

                utils.eachArray(lines, (index, value, nextItem, last) => {
                    if (last === true) {
                        next();
                        return;
                    }

                    if (matcher.test(value)) {

                        // extract the command part
                        const rawCmd = (value.substr(value.indexOf(term) + term.length)).trim().replace(/  +/g, ' ');

                        // now follow bot commands
                        for (var a in this._botcmds) {
                            const bot = this._botcmds[a];
                            const pos = rawCmd.indexOf(bot.cmd);

                            if (pos >= 0) {
                                
                                const args = rawCmd.substr(pos + bot.cmd.length).trim()


                                // prepare key
                                const key = {
                                    issue: item.issueId.id,
                                    project: item.issueId.project_id,
                                    discussion: item.id,
                                    node: 0,
                                    cmd: bot.cmd,
                                    args: args
                                }

                                self.lazydb.gitlabTodos.find({...key, read: true}).lean().exec((err, task) => {
                                    
                                    if (!task || task.length == 0) {
                                        console.log(task)
                                        key.read = true;
                                        bot.exec({
                                            issue: item.issueId.id,
                                            project: item.issueId.project_id,
                                            note: item.notes[0],
                                            args: args,
                                            rawCmd: rawCmd,
                                            addNote: (message, cb) => {
                                                const buffer = encodeURI(message)
                                                const url = `/projects/${item.issueId.project_id}/issues/${item.issueId.iid}/discussions/${item.id}/notes`;
                                                self.gitlab.post(url, { body: buffer }, cb);
                                            },
                                            reply: (message, cb) => {
                                                const buffer = encodeURI('> ' + value + "\n\n" + message)
                                                const url = `/projects/${item.issueId.project_id}/issues/${item.issueId.iid}/discussions/${item.id}/notes`;
        
                                                self.lazydb.gitlabTodos.updateOne(key, key, { upsert: true }, (err) => {
                                                    self.gitlab.post(url, { body: buffer }, (err, ret) => {
                                                        cb(err, ret);
                                                    });
                                                })
                                            }
                                        }, nextItem);

                                    }
                                    else {
                                        nextItem();
                                    }
                                })
                                return;
                            }
                        }

                        // commands not found
                        nextItem();
                    }
                    else {
                        nextItem();
                    }
                })
            }
            else {
                next();
            }

        }, () => {
            cb()
        })

    }
}

module.exports = bot