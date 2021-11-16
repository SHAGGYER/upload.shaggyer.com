const path = require("path");
const { config } = require("dotenv");
const { Db } = require("./Db");
const { Server } = require("./Server");

config({ path: path.resolve(__dirname, "..", "../.env") });

exports.Kernel = class {
  constructor() {
    this.server = new Server()
    this.db = new Db();
  }
  run() {
    this.server.run();
  }

  connectDb() {
    this.db.Connect();
  }
}
