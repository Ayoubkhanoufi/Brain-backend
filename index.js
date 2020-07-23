const fs = require("fs");
const debug = require("debug")("brain");
const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const schedule = require("node-schedule");
const url = require("url");
const redis = require("redis");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");

const lazydb = require("./lib/lazydb");
const utils = require("./lib/utils");
const Gitlab = require("./lib/gitlab");
const GitlabService = require("./services/gitlab");

const Mailer = require("./services/mail");
const Bexio = require("./services/bexio");
const Bot = require("./services/bot");
const GitlabClient = require("./services/gitlab/service");
var path = require("path");

class brain {
  constructor(options, ready) {
    const self = this;

    this.options = Object.assign({}, options);

    this.redis = redis.createClient(options.redis || {});

    this.gitlab = new Gitlab(this, options.gitlab, (err) => {
      console.log("Gitlab error", err);
    });

    //this.lazydb = new lazydb({url: options.mongo});
    this.lazydb = new lazydb({
      url: process.env.MONGO_URI
        ? process.env.MONGO_URI
        : "mongodb://127.0.0.1:27017/brain-bot",
    });

    // create expressjs context
    this.web = express();

    // Cors
    this.web.use(cors());

    // append mail service
    this.mailer = new Mailer(options.mailer || {});

    this.bexio = new Bexio(options.bexio || {});

    this.gitlabClient = new GitlabClient(options.gitlab || {});

    // initial bot service
    this.gitlabService = new GitlabService(this);

    // initial bot service
    this.bot = new Bot(this);

    // there we go
    utils.sync(
      [
        // create database
        (next) => {
          debug("Starting database");
          this.lazydb.$startDatabase(next);
        },

        // Load Gitlab replica framework
        (next) => this.gitlabService.load(next),

        // Load brain bot framework
        (next) => this.bot.load(next),

        // load web services
        (next) => {
          debug("Loading Web Services");

          // parse body
          this.web.use(
            bodyParser.json({
              extended: true,
            })
          );
          this.web.use(
            bodyParser.urlencoded({
              extended: true,
            })
          );

          this.web.use(
            session({
              secret: options.session.secret,
              resave: true,
              saveUninitialized: true,
            })
          ); // session secret

          this.web.use(passport.initialize());
          this.web.use(passport.session());
          passport.serializeUser(function (user, done) {
            done(null, user);
          });

          passport.deserializeUser(function (obj, done) {
            done(null, obj);
          });
          // const root = require('path').join(__dirname, 'public', 'admin')
          // this.web.use(express.static(path.join(__dirname, "public/admin")));
          // this.web.use(express.static(path.join((__dirname, "public/admin"))));
          // this.web.use(express.static(root));
          this.web.use("/admin", express.static(path.join(__dirname, "client")));

          this.web.get("/admin/*", function (req, res) {
            res.sendFile(
              path.join(__dirname, "client", "index.html")
            );
          });
          // populate key's response model
          this.web.use((req, res, next) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader(
              "Access-Control-Allow-Headers",
              "Origin, X-Requested-With, Content-Type, Accept"
            );
            res.setHeader(
              "Access-Control-Allow-Methods",
              "PUT, POST, GET, DELETE, OPTIONS"
            );

            res.error = (code, messages, fields) => {
              var msg = messages;
              if (!(messages instanceof Array)) msg = [messages];

              res.status(code);

              const ret = { error: true, code: code };
              if (messages) ret.messages = messages;
              if (fields) ret.fields = fields;
              res.json(ret);
              return;
            };

            res.reply = (data, cache) => {
              var ret = {
                error: false,
                cache: cache || 0,
                expires: 0,
                data: data,
              };

              if (cache === true) {
                const expires = new Date().getTime() + cache * 1000;
                res.set({
                  "Cache-Control": "private; max-age=" + cache,
                  Expires: new Date(expires).toGMTString(),
                });
              }

              res.json(ret);
              return;
            };

            // parse url
            try {
              req.urlFull = url.parse(req.url);
            } catch (e) {
              res.error("400", "Bad URL requested");
              console.log("Bad URL encoding " + req.url + ": " + e.message);
              return;
            }

            next();
          });

          next();
        },

        // load modules
        (next) => {
          debug("Loading Brain modules");

          var source = __dirname + "/modules";
          var dirs = fs.readdirSync(source);

          utils.eachArray(dirs, (index, dir, nextItem, last) => {
            debug("Loading module " + dir);
            if (last === true) {
              next();
              return;
            }

            // load module
            const fct = require(source + "/" + dir);
            fct(self, nextItem);
          });
        },

        // load Web service
        (next) => {
          this._http = http.createServer(this.web);
          this._http.listen(this.options.httpPort, () => {
            debug("HTTP interface running on " + this.options.httpPort);
            next();
          });
        },

        // retrieve 404
        (next) => {
          this.web.use((req, res, end) => {
            res.error(404, "Route not found");
          });
          next();
        },
      ],
      () => {
        debug("Brain is ready");
      }
    );
  }

  mongoPage(modelfind, element, cb) {
    const self = this;
    const mongoNumPage = 10;

    function mongoPage(num) {
      const mongoPageSkip = (num - 1) * mongoNumPage;

      modelfind
        .skip(mongoPageSkip)
        .limit(mongoNumPage)
        .lean()
        .exec((err, items) => {
          if (err || items.length == 0) {
            if (cb) cb();
            return;
          }

          utils.eachArray(items, (index, value, nextItem, last) => {
            if (last === true) {
              process.nextTick(mongoPage, num + 1);
              return;
            }

            element(value, nextItem);
          });
        });
    }
    mongoPage(1);
  }

  syncSimple(opts, next, assign) {
    const text = opts.text;
    const db = opts.db;
    const route = opts.route;
    const cache = opts.cache || false;

    const self = this;

    var revalidate = false;

    function page(num) {
      debug(text + " page #" + num);
      self.gitlab.get(
        route,
        { scope: "all", page: num },
        (err, items) => {
          if (!items || items.length == 0) {
            if (next) next();
            return;
          }

          utils.eachArray(items, (index, value, nextItem, last) => {
            if (last === true) {
              process.nextTick(page, num + 1);
              return;
            }

            if (opts.beforeUpdate) {
              opts.beforeUpdate(value, () => {
                db.updateOne(
                  { id: value.id },
                  value,
                  { upsert: true },
                  (err) => {
                    nextItem();
                  }
                );
              });
            } else {
              db.updateOne({ id: value.id }, value, { upsert: true }, (err) => {
                nextItem();
              });
            }
          });
        },
        { cache: cache, revalidate: revalidate }
      );
    }
    page(1);
  }

  schedule(name, date, executor) {
    var running = false;
    var j = schedule.scheduleJob(date, function () {
      if (running === true) {
        debug("Skipping schedule for " + name);
        return;
      }
      running = true;
      executor(() => {
        running = false;
      });
    });
  }
}

// Try to load configuration file
var configFile = __dirname + "/config.js";
var externalConfig = {
  me: "jarvisdev",
  mongo: "mongodb://127.0.0.1:27017/brain-bot",
  httpPort: 8585,
  gitlab: {
    host: "https://git.pulse.digital/api/v4",
    token: "Ng4Ut8Bby-3izY9Cwfau",
  },
  jwt: {
    secret: "6qGRU1XN~wpJ0t:TOKtyguPFA9VYkG2hA!y{oCqsSz7VYW5a%Bi",
    expire: "1d",
  },
  tmpDir: "/tmp",
  middlewareDataDir: process.env.MD_DATA_DIR || "/home/brain/data",
  roles: {
    admin: {
      mykiimike: true,
    },
  },
  mailer: {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.OUTLOOK_MAIL_USERNAME || "dev@pulse.digital",
      pass: process.env.OUTLOOK_MAIL_PASSWORD || "2imBBqX85",
    },
    //   tls: { ciphers: "SSLv3" }
  },
  auth: {
    jwtSecretKey: "xyzxyzxyz",
  },
  session: {
    secret: "xyzxyzxyz",
  },
  linkedin: {
    callbackURL: "http://127.0.0.1:8585/auth/linkedin/callback",
    secretKey: process.env.LINKEDIN_SECRET_KEY || "4rlRQ5y69WShy2rT",
    clientId: process.env.LINKEDIN_API_KEY || "77vu2aw6hnvvar",
  }, 
  bexio: {
    apiBaseUrl: "https://api.bexio.com/2.0/",
    accessToken:
      "eyJraWQiOiI2ZGM2YmJlOC1iMjZjLTExZTgtOGUwZC0wMjQyYWMxMTAwMDIiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzLmFiZGVycmFoaW1AcHVsc2UuZGlnaXRhbCIsImxvZ2luX2lkIjoiMzBkNjA5YmQtZjhkYi00N2I0LThkODktMTNhOTdjNmZmYmNjIiwiY29tcGFueV9pZCI6IjRtZGFhYm96MG9udiIsInVzZXJfaWQiOjIzMzU1NiwiYXpwIjoiZXZlcmxhc3QtdG9rZW4tb2ZmaWNlLWNsaWVudCIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgYWxsIHRlY2huaWNhbCIsImlzcyI6Imh0dHBzOlwvXC9pZHAuYmV4aW8uY29tIiwiZXhwIjozMTY0MTgxNzU2LCJpYXQiOjE1ODczODE3NTYsImNvbXBhbnlfdXNlcl9pZCI6MiwianRpIjoiYmFiYTY4NTgtM2M5Mi00N2I1LWI0ZmYtMjgyZWQ5M2EzMDZhIn0.XAKJwxorzE6Eo3Z5pN-YDqdiABWjdtVHitz8kBcUyhKMeaMOV3hBZbeHB3hFUp2z21Nn5ofWm3YIOCV7UZeFErFyZ_xPmUmaR8w6p8sgpL5Err2YxSLR2oKeAIJx6uBmozPHGtP9_-XJOT3zhuDIAPeqT8RdX2p1DCw75f_BxGJXFLQYPnofnxTJGFugl8zY5SM9AbI3lfi0fvdyAQvybeDv51SyHGI0aNBcbYkmh2KhUEkR1ZnpCz4OcA9VdmgNjovExzltfukpS-122J9RXDdX4moCDqjbcaTLVPGJzLGGfGJQWnTs9qxDbIc1lxJRFbELL_6ObWAOW4tpQ7Fc0sMKVEFkqBoyFByzPAqWfRSF7SOwxRt6f4E3-XqJ4w0HkPdKcWGzuMkz8Pt4jap2zs_7FRzcpS-JY-a8fiQbUWNPgr_m-heIQP85icP9EpMHJjEWJvUBnKpVR6MJJedfoLQXoJbVL6ESbwAlDVvzKG3djE54NP49PiiDtzvGd1UFdLUsoja9kxe-LbJPwA2GOe7lfuCqKAXVJznkOpPsAqa66tTA7Nlv8A6Zp5DtqkHGfG8mSinadC3doQefVc2aA5DtcRGZawenKQVVUjIyauCnwqc6Skn0E3jOBtdLO1F33QbMpwYIpYAsnhd2JDbmcTpe2MmGwvGm_bU-pFikQmM",
  },
};

fs.stat(configFile, (err, stat) => {
  if (!err) {
    debug("There is a configuration file in " + configFile);
    externalConfig = require(configFile);
  }
  new brain(externalConfig);
});
