import { config } from "dotenv";
import path from "path";
import { Db } from "./Db";
import { Server } from "./Server";
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { TYPES } from "../types.inversify";
config({ path: path.resolve(__dirname, "..", "../.env") });


@injectable()
export class Kernel {
  private server: Server;
  private db: Db;
  constructor(@inject(TYPES.Server) server: Server, @inject(TYPES.Db) db: Db) {

    this.server = server;
    this.db = db;
  }
  run() {
    this.server.run();
  }

  connectDb() {
    this.db.Connect();
  }
}
