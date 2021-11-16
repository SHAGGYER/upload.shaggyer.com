import mongoose from "mongoose";
import "reflect-metadata";
import { injectable } from "inversify";

@injectable()
export class Db {
  Connect() {
    mongoose.connect(
      process.env.MONGODB_URI!,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      },
      () => console.log("Connected to MongoDB")
    );
  }
}
