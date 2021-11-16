const express = require("express");
const bodyParser = require("body-parser");
const io = require("socket.io");
const { AppService } = require("../services/AppService");
const cors = require("cors");
const routes = require("../routes");
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-github2");

exports.Server = class {
  constructor() {
    this.app = express();
    this.appService = new AppService();
  }

  setUpPassport() {
    passport.serializeUser(function (user, done) {
      done(null, user);
    });

    passport.deserializeUser(function (obj, done) {
      done(null, obj);
    });

    passport.use(
      new Strategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL,
        },
        async function (accessToken, refreshToken, profile, done) {
          /*   let user = await User.findOne({ email: profile.emails[0].value });
          if (!user) {
            user = new User({
              email: profile.emails[0].value.toLowerCase(),
              displayName: profile.username,
              githubAccessToken: accessToken,
              githubUsername: profile.username,
            });

            await user.save();
          } else {
            user.githubAccessToken = accessToken;
            user.githubUsername = profile.username;
            await user.save();
          }*/

          return done(null, { profile, accessToken });
        }
      )
    );
  }

  run() {
    this.configureMiddleware();
    this.setUpPassport();
    this.loadRoutes();

    const PORT = process.env.NODE_PORT;
    const server = this.app.listen(PORT, () =>
      console.log("Server started on port " + PORT)
    );
    const socketServer = io(server);
    socketServer.on("connection", (socket) => {
      this.appService.runIoServer(socket, socketServer);
    });
  }

  loadRoutes() {
    this.app.use(routes);
  }

  configureMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(session({secret: "amsldmasldmk1mk2dm12kdmk12mdk12mdk12"}))
    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }
}
