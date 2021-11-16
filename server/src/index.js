const { Kernel } = require("./kernel/Kernel");

const kernel = new Kernel();
kernel.connectDb();
kernel.run();
