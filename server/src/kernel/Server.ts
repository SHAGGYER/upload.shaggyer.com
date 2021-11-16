import express, { Application } from "express";
import { Server as HttpServer } from "http";
import bodyParser from "body-parser";
import { Server as IOServer } from "socket.io";
import { AppService } from "services/AppService";
import cors from "cors";
import path from "path";
import routes from "../routes/index";
import "reflect-metadata";
const session = require("express-session");
import passport from "passport";

import { inject, injectable } from "inversify";
import { TYPES } from "../types.inversify";
import { Strategy } from "passport-github2";

@injectable()
export class Server {
  public app: Application;

  constructor(@inject(TYPES.AppService) private appService: AppService) {
    this.app = express();
  }

  setUpPassport() {
    passport.serializeUser(function (user, done) {
      done(null, user);
    });

    passport.deserializeUser(function (obj: any, done) {
      done(null, obj);
    });

    passport.use(
      new Strategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          callbackURL: process.env.GITHUB_CALLBACK_URL!,
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
    const server: HttpServer = this.app.listen(PORT, () =>
      console.log("Server started on port " + PORT)
    );
    const socketServer = new IOServer(server);
    socketServer.on("connection", (socket) => {
      this.appService.runIoServer(socket, socketServer);
    });
  }

  loadRoutes() {
    this.app.use(routes);
  }

  configureMiddleware() {
    this.app.set("view engine", "ejs");
    this.app.set("views", path.join(__dirname, "../..", "views"));

    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(session({secret: "secret"}))
    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }
}
