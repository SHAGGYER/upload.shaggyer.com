const mongoose = require("mongoose");

exports.Db = class {
  Connect() {
    mongoose.connect(
      process.env.MONGODB_URI,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      },
      () => console.log("Connected to MongoDB")
    );
  }
}
